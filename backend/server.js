const express = require('express');
const cors = require('cors');
const getConnection = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// -------------------------Test API---------------------------------------
app.get('/api/test', (req, res) => {
  res.json({ message: "Backend is working!" });
});

// Fetch data from Oracle
app.get('/api/employee', async (req, res) => {
  let connection;

  try {
    connection = await getConnection();

    const result = await connection.execute(
      `SELECT * FROM EMPLOYEE`
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

// --------------------------------------CUSTOMER-------------------------------------------------

// POST /api/customers
app.post('/api/customers', async (req, res) => {
    const { CUST_FNAME, CUST_LNAME, CUST_PHONE } = req.body;

    if (!CUST_FNAME || !CUST_LNAME || !CUST_PHONE) {
        return res.status(400).json({ success: false, error: "All fields are required" });
    }

    let connection;

    try {
        connection = await getConnection();

        // Get current max CUST_ID
        const result = await connection.execute(
            `SELECT MAX(CUST_ID) AS MAX_ID FROM CUSTOMER`
        );

        let maxId = result.rows[0][0]; // e.g., "C005"
        let newId;

        if (!maxId) {
            newId = "C001"; // Table empty
        } else {
            const num = parseInt(maxId.slice(1), 10) + 1;
            newId = "C" + num.toString().padStart(3, "0");
        }

        // Insert with generated CUST_ID
        const insertSql = `
            INSERT INTO CUSTOMER (CUST_ID, CUST_FNAME, CUST_LNAME, CUST_PHONE)
            VALUES (:id, :fName, :lName, :phone)
        `;

        await connection.execute(insertSql, {
            id: newId,
            fName: CUST_FNAME,
            lName: CUST_LNAME,
            phone: CUST_PHONE
        }, { autoCommit: true });

        res.json({ success: true, id: newId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    } finally {
        if (connection) await connection.close();
    }
});

// Fetch all customers
app.get("/api/customers", async (req, res) => {
  let connection;
  try {
    connection = await getConnection();

    const sql = `
      SELECT
        c.CUST_ID,
        c.CUST_FNAME,
        c.CUST_LNAME,
        c.CUST_PHONE,
        NVL((
          SELECT COUNT(*)
          FROM BOOKING b
          WHERE b.CUST_ID = c.CUST_ID
        ), 0) AS TOTAL_BOOKINGS
      FROM CUSTOMER c
      GROUP BY c.CUST_ID, c.CUST_FNAME, c.CUST_LNAME, c.CUST_PHONE
      ORDER BY c.CUST_ID
    `;

    const result = await connection.execute(sql);

    const customers = result.rows.map(r => ({
      id: r[0],
      name: `${r[1]} ${r[2] || ""}`.trim(),
      phone: r[3],
      totalBookings: r[4]
    }));

    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) await connection.close();
  }
});


// GET single customer by ID
app.get('/api/customers/:id', async (req, res) => {
    const id = req.params.id;
    let connection;
    try {
        connection = await getConnection();
        const result = await connection.execute(
            `SELECT CUST_ID, CUST_FNAME, CUST_LNAME, CUST_PHONE
             FROM CUSTOMER
             WHERE CUST_ID = :id`,
            { id }
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Customer not found" });
        }

        const row = result.rows[0];
        res.json({
            id: row[0],
            fname: row[1],
            lname: row[2],
            phone: row[3]
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) await connection.close();
    }
});

// PUT update customer
app.put('/api/customers/:id', async (req, res) => {
    const id = req.params.id;
    const { CUST_FNAME, CUST_LNAME, CUST_PHONE } = req.body;

    if (!CUST_FNAME || !CUST_LNAME || !CUST_PHONE) {
        return res.status(400).json({ error: "All fields are required" });
    }

    let connection;
    try {
        connection = await getConnection();
        await connection.execute(
            `UPDATE CUSTOMER
             SET CUST_FNAME = :fname,
                 CUST_LNAME = :lname,
                 CUST_PHONE = :phone
             WHERE CUST_ID = :id`,
            { fname: CUST_FNAME, lname: CUST_LNAME, phone: CUST_PHONE, id },
            { autoCommit: true }
        );

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) await connection.close();
    }
});

// Delete customer only if they have 0 bookings
app.delete("/api/customers/:id", async (req, res) => {
  let connection;
  const custId = String(req.params.id || "").trim().toUpperCase();

  if (!custId) {
    return res.status(400).json({ success: false, error: "Customer ID is required." });
  }

  try {
    connection = await getConnection();

    // 1) Check if customer exists
    const existResult = await connection.execute(
      `SELECT COUNT(*) FROM CUSTOMER WHERE CUST_ID = :id`,
      { id: custId }
    );

    const exists = existResult.rows[0][0];
    if (exists === 0) {
      return res.status(404).json({ success: false, error: "Customer not found." });
    }

    // 2) Check bookings count
    const checkResult = await connection.execute(
      `SELECT COUNT(*) FROM BOOKING WHERE CUST_ID = :id`,
      { id: custId }
    );

    const bookingCount = checkResult.rows[0][0];

    if (bookingCount > 0) {
      return res.status(400).json({
        success: false,
        error: "Cannot delete customer. Customer has existing bookings."
      });
    }

    // 3) Safe delete
    const deleteResult = await connection.execute(
      `DELETE FROM CUSTOMER WHERE CUST_ID = :id`,
      { id: custId },
      { autoCommit: true }
    );

    if (deleteResult.rowsAffected === 0) {
      return res.status(404).json({ success: false, error: "Customer not found." });
    }

    return res.json({ success: true, message: "Customer deleted successfully." });

  } catch (err) {
    console.error("Delete customer error:", err);

    // Friendly FK error (if FK still blocks deletion)
    if (String(err.message || "").includes("ORA-02292")) {
      return res.status(400).json({
        success: false,
        error: "Cannot delete customer because it is referenced by other records."
      });
    }

    return res.status(500).json({ success: false, error: err.message });
  } finally {
    if (connection) await connection.close();
  }
});



// -----------------------------------------SUPPLIER-------------------------------------------------

// GET all suppliers
app.get("/api/suppliers", async (req, res) => {
  let connection;
  try {
    connection = await getConnection();

    const sql = `
      SELECT
        s.SUPP_ID,
        s.SUPP_NAME,
        NVL((
          SELECT COUNT(*)
          FROM ITEM i
          WHERE i.SUPP_ID = s.SUPP_ID
        ), 0) AS TOTAL_ITEMS
      FROM SUPPLIER s
      GROUP BY s.SUPP_ID, s.SUPP_NAME
      ORDER BY s.SUPP_NAME
    `;

    const result = await connection.execute(sql);

    const suppliers = result.rows.map(r => ({
      id: r[0],
      name: r[1],
      totalItems: r[2]
    }));

    res.json(suppliers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

// GET supplier by ID
app.get('/api/suppliers/:id', async (req, res) => {
    const id = req.params.id;
    let connection;
    try {
        connection = await getConnection();
        const result = await connection.execute(
            `SELECT SUPP_ID, SUPP_NAME, SUPP_PHONE, SUPP_EMAIL, SUPP_ADDRESS
             FROM SUPPLIER WHERE SUPP_ID = :id`,
            { id }
        );

        if (result.rows.length === 0) return res.status(404).json({ error: "Supplier not found" });

        const row = result.rows[0];
        res.json({
            id: row[0],
            name: row[1],
            phone: row[2],
            email: row[3],
            address: row[4]
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) await connection.close();
    }
});

// PUT update supplier
app.put('/api/suppliers/:id', async (req, res) => {
    const id = req.params.id;
    const { SUPP_NAME, SUPP_PHONE, SUPP_EMAIL, SUPP_ADDRESS } = req.body;

    if (!SUPP_NAME || !SUPP_PHONE || !SUPP_EMAIL || !SUPP_ADDRESS)
        return res.status(400).json({ error: "All fields are required" });

    let connection;
    try {
        connection = await getConnection();
        await connection.execute(
            `UPDATE SUPPLIER
             SET SUPP_NAME = :name,
                 SUPP_PHONE = :phone,
                 SUPP_EMAIL = :email,
                 SUPP_ADDRESS = :address
             WHERE SUPP_ID = :id`,
            { name: SUPP_NAME, phone: SUPP_PHONE, email: SUPP_EMAIL, address: SUPP_ADDRESS, id },
            { autoCommit: true }
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    } finally {
        if (connection) await connection.close();
    }
});

// POST add new supplier 
app.post('/api/suppliers', async (req, res) => {
  const { SUPP_NAME, SUPP_PHONE, SUPP_EMAIL, SUPP_ADDRESS } = req.body;

  // Validate input required fields
  if (!SUPP_NAME || !SUPP_PHONE || !SUPP_EMAIL || !SUPP_ADDRESS) {
    return res.status(400).json({ success: false, error: "All fields are required" });
  }

  const name = String(SUPP_NAME).trim();
  const phone = String(SUPP_PHONE).trim();
  const email = String(SUPP_EMAIL).trim();
  const address = String(SUPP_ADDRESS).trim();

  // Server-side email format validation (never trust client only)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, error: "Invalid email format" });
  }

  let connection;
  try {
    connection = await getConnection();

    // ✅ Check duplicate email (case-insensitive, ignore spaces)
    const dupCheck = await connection.execute(
      `SELECT COUNT(*) FROM SUPPLIER WHERE LOWER(TRIM(SUPP_EMAIL)) = LOWER(TRIM(:email))`,
      { email }
    );

    const count = dupCheck.rows?.[0]?.[0] || 0;
    if (count > 0) {
      return res.status(409).json({
        success: false,
        error: "Supplier email already exists. Please use a different email."
      });
    }

    // Get max SUPP_ID (S001, S002...)
    const result = await connection.execute(
      `SELECT MAX(SUPP_ID) AS MAX_ID FROM SUPPLIER`
    );

    const maxId = result.rows?.[0]?.[0]; // e.g. "S005"
    let nextId = "S001";

    if (maxId) {
      const num = parseInt(String(maxId).slice(1), 10) + 1;
      nextId = "S" + num.toString().padStart(3, "0");
    }

    // Insert new supplier
    await connection.execute(
      `INSERT INTO SUPPLIER (SUPP_ID, SUPP_NAME, SUPP_PHONE, SUPP_EMAIL, SUPP_ADDRESS)
       VALUES (:id, :name, :phone, :email, :address)`,
      {
        id: nextId,
        name,
        phone,
        email,
        address
      },
      { autoCommit: true }
    );

    return res.json({ success: true, id: nextId });

  } catch (err) {
    console.error(err);

    if (String(err.message || "").includes("ORA-00001")) {
      return res.status(409).json({
        success: false,
        error: "Supplier email already exists. Please use a different email."
      });
    }

    return res.status(500).json({ success: false, error: err.message });
  } finally {
    if (connection) await connection.close();
  }
});


// DELETE supplier by ID with reference check (Oracle)
app.delete('/api/suppliers/:id', async (req, res) => {
  const id = String(req.params.id || "").trim().toUpperCase();
  let connection;

  if (!id) {
    return res.status(400).json({ success: false, error: "Supplier ID is required." });
  }

  try {
    connection = await getConnection();

    // 1) Check if any ITEM references this supplier
    const itemCheck = await connection.execute(
      `SELECT COUNT(*) FROM ITEM WHERE SUPP_ID = :id`,
      { id }
    );

    const itemCount = Number(itemCheck.rows?.[0]?.[0] || 0);

    if (itemCount > 0) {
      return res.status(400).json({
        success: false,
        error: "Cannot delete supplier. It is referenced by one or more items."
      });
    }

    // 2) Delete supplier
    const deleteResult = await connection.execute(
      `DELETE FROM SUPPLIER WHERE SUPP_ID = :id`,
      { id }
    );

    if (deleteResult.rowsAffected === 0) {
      return res.status(404).json({ success: false, error: "Supplier not found." });
    }

    await connection.commit();
    return res.json({ success: true });

  } catch (err) {
    console.error("Delete supplier error:", err);

    // Nice message for FK constraint violation (just in case)
    if (String(err.message || "").includes("ORA-02292")) {
      return res.status(400).json({
        success: false,
        error: "Cannot delete supplier because it is referenced by other records."
      });
    }

    return res.status(500).json({ success: false, error: err.message });
  } finally {
    try { if (connection) await connection.close(); } catch (e) {}
  }
});


// -----------------------------------------ITEM-------------------------------------------------

// GET all items
app.get('/api/items', async (req, res) => {
  let connection;

  // optional filters
  const status = String(req.query.status || "").trim().toUpperCase(); // e.g. AVAILABLE
  const minBookings = Number(req.query.minBookings || 0); // NEW

  try {
    connection = await getConnection();

    const sql = `
      SELECT
        i.ITEM_NO,
        i.ITEM_NAME,
        i.ITEM_TYPE,
        i.ITEM_DESC,
        i.RATE_TYPE,
        i.ITEM_RATE,
        i.ITEM_STATUS,
        NVL(s.SUPP_NAME, '-') AS SUPP_NAME,

        -- analytics (complexity)
        NVL(SUM(bk.SUBTOTAL), 0) AS TOTAL_ITEM_REVENUE,
        NVL(COUNT(DISTINCT bk.BOOKING_ID), 0) AS USED_IN_BOOKINGS

      FROM ITEM i
      LEFT JOIN SUPPLIER s
        ON i.SUPP_ID = s.SUPP_ID
      LEFT JOIN BOOKINGITEM bk
        ON i.ITEM_NO = bk.ITEM_NO

      WHERE (:status IS NULL OR UPPER(i.ITEM_STATUS) = :status)

      GROUP BY
        i.ITEM_NO,
        i.ITEM_NAME,
        i.ITEM_TYPE,
        i.ITEM_DESC,
        i.RATE_TYPE,
        i.ITEM_RATE,
        i.ITEM_STATUS,
        s.SUPP_NAME

      HAVING NVL(COUNT(DISTINCT bk.BOOKING_ID), 0) >= :minBookings

      ORDER BY i.ITEM_NO
    `;

    const binds = {
      status: status ? status : null,
      minBookings: Number.isNaN(minBookings) ? 0 : minBookings
    };


    const result = await connection.execute(sql, binds);

    const items = result.rows.map(row => ({
      itemNo: row[0],
      name: row[1],
      type: row[2],
      desc: row[3],
      rateType: row[4],
      rate: row[5],
      status: row[6],
      supplier: row[7],
      totalItemRevenue: row[8],
      usedInBookings: row[9]
    }));

    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

// GET single item by ITEM_NO
app.get('/api/items/:itemNo', async (req, res) => {
  const itemNo = req.params.itemNo;
  let connection;

  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT 
          i.ITEM_NO,
          i.ITEM_NAME,
          i.ITEM_TYPE,
          i.ITEM_DESC,
          i.RATE_TYPE,
          i.ITEM_RATE,
          i.ITEM_STATUS,
          i.SUPP_ID,
          s.SUPP_NAME
       FROM ITEM i
       LEFT JOIN SUPPLIER s 
         ON i.SUPP_ID = s.SUPP_ID
       WHERE i.ITEM_NO = :itemNo`,
      { itemNo }
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Item not found" });

    const row = result.rows[0];
    res.json({
      itemNo: row[0],
      name: row[1],
      type: row[2],
      desc: row[3],
      rateType: row[4],
      rate: row[5],
      status: row[6],
      suppId: row[7],
      supplier: row[8] || "-"   // show "-" when no supplier
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

// GET all suppliers
app.get('/api/suppliers', async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        const result = await connection.execute(
            `SELECT SUPP_ID, SUPP_NAME FROM SUPPLIER ORDER BY SUPP_NAME`
        );

        const suppliers = result.rows.map(row => ({ id: row[0], name: row[1] }));
        res.json(suppliers);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) await connection.close();
    }
});

// PUT update item
app.put('/api/items/:itemNo', async (req, res) => {
    const itemNo = req.params.itemNo;
    const { ITEM_NAME, ITEM_TYPE, ITEM_DESC, RATE_TYPE, ITEM_RATE, ITEM_STATUS, SUPP_ID } = req.body;

    let connection;
    try {
        connection = await getConnection();
        await connection.execute(
          `UPDATE ITEM SET ITEM_NAME=:ITEM_NAME, ITEM_TYPE=:ITEM_TYPE, ITEM_DESC=:ITEM_DESC, RATE_TYPE=:RATE_TYPE,
                            ITEM_RATE=:ITEM_RATE, ITEM_STATUS=:ITEM_STATUS, SUPP_ID=:SUPP_ID
          WHERE ITEM_NO=:itemNo`,
          {
              ITEM_NAME: ITEM_NAME,
              ITEM_TYPE: ITEM_TYPE,
              ITEM_DESC: ITEM_DESC,
              RATE_TYPE: RATE_TYPE,
              ITEM_RATE: ITEM_RATE,
              ITEM_STATUS: ITEM_STATUS,
              SUPP_ID: SUPP_ID || null,
              itemNo
          },
          { autoCommit: true }
      );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    } finally {
        if (connection) await connection.close();
    }
});

// POST /api/items
app.post('/api/items', async (req, res) => {
    const { ITEM_NAME, ITEM_TYPE, ITEM_DESC, RATE_TYPE, ITEM_RATE, ITEM_STATUS, SUPP_ID } = req.body;

    if (!ITEM_NAME || !ITEM_TYPE || !ITEM_DESC || !RATE_TYPE || !ITEM_RATE || !ITEM_STATUS) {
        return res.status(400).json({ success: false, error: "Missing required fields" });
    }


    let connection;
    try {
        connection = await getConnection();

        // Get last ITEM_NO
        const lastItem = await connection.execute(
            `SELECT ITEM_NO FROM ITEM ORDER BY ITEM_NO DESC FETCH NEXT 1 ROWS ONLY`
        );

        let newItemNo = "I001";
        if (lastItem.rows.length > 0) {
            const lastNo = lastItem.rows[0][0].substring(1); // remove "I"
            const nextNo = (parseInt(lastNo, 10) + 1).toString().padStart(3, "0");
            newItemNo = "I" + nextNo;
        }

        const sql = `
          INSERT INTO ITEM 
          (ITEM_NO, ITEM_NAME, ITEM_TYPE, "ITEM_DESC", RATE_TYPE, ITEM_RATE, ITEM_STATUS, SUPP_ID)
          VALUES (:itemNo, :itemName, :itemType, :itemDesc, :rateType, :itemRate, :itemStatus, :suppId)
        `;

        await connection.execute(
            sql,
            {
                itemNo: newItemNo,
                itemName: ITEM_NAME,
                itemType: ITEM_TYPE,
                itemDesc: ITEM_DESC,
                rateType: RATE_TYPE,
                itemRate: parseFloat(ITEM_RATE),
                itemStatus: ITEM_STATUS,
                suppId: SUPP_ID || null
            },
            { autoCommit: true }
        );

        res.json({ success: true });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    } finally {
        if (connection) await connection.close();
    }
});

// DELETE item by ID with reference check (Oracle)
app.delete('/api/items/:itemNo', async (req, res) => {
  const itemNo = String(req.params.itemNo || "").trim().toUpperCase();
  let connection;

  if (!itemNo) {
    return res.status(400).json({ success: false, error: "Missing itemNo." });
  }

  try {
    connection = await getConnection();

    // 1) Check item exists first (clearer errors)
    const exists = await connection.execute(
      `SELECT COUNT(*) FROM ITEM WHERE ITEM_NO = :itemNo`,
      { itemNo }
    );

    if (exists.rows[0][0] === 0) {
      return res.status(404).json({ success: false, error: "Item not found." });
    }

    // 2) Check if referenced by BOOKINGITEM
    const check = await connection.execute(
      `SELECT COUNT(*) FROM BOOKINGITEM WHERE ITEM_NO = :itemNo`,
      { itemNo }
    );

    if (check.rows[0][0] > 0) {
      return res.status(400).json({
        success: false,
        error: "Cannot delete item. This item is referenced in BOOKINGITEM (used in booking)."
      });
    }

    // 3) Delete safely
    const del = await connection.execute(
      `DELETE FROM ITEM WHERE ITEM_NO = :itemNo`,
      { itemNo }
    );

    // if somehow no rows deleted
    if (del.rowsAffected === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: "Item not found." });
    }

    await connection.commit();
    return res.json({ success: true, message: "Item deleted successfully." });

  } catch (err) {
    console.error("Delete item error:", err);

    // Friendly FK constraint error (Oracle)
    // ORA-02292: integrity constraint ... child record found
    if (String(err.message || "").includes("ORA-02292")) {
      return res.status(400).json({
        success: false,
        error: "Cannot delete item. It is referenced by another record (child record exists)."
      });
    }

    return res.status(500).json({ success: false, error: err.message });

  } finally {
    try { if (connection) await connection.close(); } catch (e) {}
  }
});

//------------------------------------------------HOUSEKEEPING-----------------------------------------------------------//
// POST /api/housekeeping
app.post('/api/housekeeping', async (req, res) => {
    const { HOMESTAY_ID, EMP_ID, HK_DATE } = req.body;

    if (!HOMESTAY_ID || !EMP_ID || !HK_DATE) {
        return res.status(400).json({ success: false, error: "All fields are required" });
    }

    let connection;

    try {
        connection = await getConnection();

        // Get current max CUST_ID
        const result = await connection.execute(
            `SELECT MAX(HOUSEKEEP_ID) AS MAX_ID FROM HOUSEKEEPING`
        );

        let maxId = result.rows[0][0]; // e.g., "HK005"
        let newId;

        if (!maxId) {
            newId = "HK001"; // Table empty
        } else {
            const num = parseInt(maxId.slice(2), 10) + 1;
            newId = "HK" + num.toString().padStart(3, "0");
        }

        // Insert with generated HOUSEKEEP_ID
        const insertSql = `
            INSERT INTO HOUSEKEEPING (HOUSEKEEP_ID, HOMESTAY_ID, EMP_ID, HK_DATE, STATUS)
            VALUES (:id, :hID, :empID, TO_DATE(:hDate,'DD/MM/YYYY'), :hStatus)
        `;

        // Default status
        let defaultStatus = "SCHEDULED";

        await connection.execute(insertSql, {
            id: newId,
            hID: HOMESTAY_ID,
            empID: EMP_ID,
            hDate: HK_DATE,
            hStatus: defaultStatus
        }, { autoCommit: true });

        res.json({ success: true, id: newId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    } finally {
        if (connection) await connection.close();
    }
});

// GET single housekeeping record by ID
app.get('/api/housekeeping/:id', async (req, res) => {
    const id = req.params.id;
    let connection;
    
    try {
        connection = await getConnection();
        
        const result = await connection.execute(
            `SELECT 
                h.HOUSEKEEP_ID,
                hm.HOMESTAY_NAME,
                e.EMP_FNAME || ' ' || e.EMP_LNAME AS EMPLOYEE_NAME,
                TO_CHAR(h.HK_DATE, 'YYYY-MM-DD') AS HK_DATE,
                h.STATUS
             FROM HOUSEKEEPING h
             JOIN HOMESTAY hm ON h.HOMESTAY_ID = hm.HOMESTAY_ID
             JOIN EMPLOYEE e ON h.EMP_ID = e.EMP_ID
             WHERE h.HOUSEKEEP_ID = :id`,
            { id }
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Housekeeping record not found" });
        }

        const row = result.rows[0];
        const housekeeping = {
            id: row[0],
            homestay: row[1],
            employee: row[2],
            hk_date: row[3],
            status: row[4]
        };

        res.json(housekeeping);

    } catch(err) { 
        console.error(err);
        res.status(500).json({ error: err.message }); 
    } finally { 
        if(connection) await connection.close(); 
    }
});

// Fetch all housekeeping jobs
app.get('/api/housekeeping', async (req,res)=>{
    let connection;
    try {
        connection = await getConnection();
        const result = await connection.execute(
            `SELECT h.HOUSEKEEP_ID,
                    hm.HOMESTAY_NAME,
                    e.EMP_FNAME || ' ' || e.EMP_LNAME AS EMPLOYEE_NAME,
                    h.HK_DATE,
                    h.STATUS
             FROM HOUSEKEEPING h
             JOIN HOMESTAY hm ON h.HOMESTAY_ID = hm.HOMESTAY_ID
             JOIN EMPLOYEE e ON h.EMP_ID = e.EMP_ID
             ORDER BY h.HK_DATE DESC`
        );

        // Map to objects for easier frontend usage
        const housekeeping = result.rows.map(row => ({
            id: row[0],
            homestay: row[1],
            employee: row[2],
            hk_date: row[3],
            status: row[4]
        }));

        res.json(housekeeping);

    } catch(err){ 
        res.status(500).json({error: err.message}); 
    } finally { 
        if(connection) await connection.close(); 
    }
});

// PUT update housekeeping record
app.put('/api/housekeeping/:id', async (req, res) => {
    const id = req.params.id;
    const { HK_DATE, STATUS } = req.body;
    
    let connection;
    
    try {
        connection = await getConnection();
        
        await connection.execute(
            `UPDATE HOUSEKEEPING 
             SET HK_DATE = TO_DATE(:hk_date, 'YYYY-MM-DD'), 
                 STATUS = UPPER(:status )
             WHERE HOUSEKEEP_ID = :id`,
            {
                hk_date: HK_DATE,
                status: STATUS,
                id: id
            },
            { autoCommit: true }
        );
        
        res.json({ success: true });
        
    } catch(err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    } finally {
        if(connection) await connection.close();
    }
});


// GET /api/booking-years
app.get('/api/booking-years', async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        const result = await connection.execute(
            `SELECT DISTINCT EXTRACT(YEAR FROM BOOKING_DATE) AS year 
             FROM BOOKING 
             ORDER BY year DESC`
        );

        const years = result.rows.map(r => r[0]);
        res.json(years);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) await connection.close();
    }
});

// DELETE housekeeping by ID
app.delete('/api/housekeeping/:id', async (req, res) => {
  const id = String(req.params.id || "").trim().toUpperCase();
  let connection;

  if (!id) {
    return res.status(400).json({ success: false, error: "Missing housekeeping id." });
  }

  try {
    connection = await getConnection();

    // Optional: check existence first (gives nicer message)
    const chk = await connection.execute(
      `SELECT COUNT(*) FROM HOUSEKEEPING WHERE HOUSEKEEP_ID = :id`,
      { id }
    );

    if (chk.rows[0][0] === 0) {
      return res.status(404).json({ success: false, error: "Housekeeping record not found." });
    }

    const result = await connection.execute(
      `DELETE FROM HOUSEKEEPING WHERE HOUSEKEEP_ID = :id`,
      { id }
    );

    if (result.rowsAffected === 0) {
      await connection.rollback();
      return res.status(500).json({ success: false, error: "Delete failed (no rows affected)." });
    }

    await connection.commit();
    return res.json({ success: true });

  } catch (err) {
    console.error("Delete housekeeping error:", err);
    try { if (connection) await connection.rollback(); } catch (e) {}

    // FK constraint error
    if (String(err.message || "").includes("ORA-02292")) {
      return res.status(400).json({
        success: false,
        error: "Cannot delete housekeeping: it is referenced in other records."
      });
    }

    return res.status(500).json({ success: false, error: err.message });

  } finally {
    try { if (connection) await connection.close(); } catch (e) {}
  }
});



//------------------------------------------------EMPLOYEE------------------------------------------------------------//
// POST /api/employees
app.post('/api/employees', async (req, res) => {
    const { EMP_FNAME, EMP_LNAME, EMP_DOB, EMP_HIRE_DATE, EMP_PHONE, EMP_TYPE, WAGE } = req.body;

    // Validation
    if (!EMP_FNAME || !EMP_LNAME || !EMP_DOB || !EMP_HIRE_DATE || !EMP_PHONE || !EMP_TYPE || !WAGE) {
        return res.status(400).json({ success: false, error: "All fields are required" });
    }

    let connection;

    try {
        connection = await getConnection();

        // Generate new EMP_ID
        const result = await connection.execute(
            `SELECT MAX(EMP_ID) AS MAX_ID FROM EMPLOYEE`
        );

        let maxId = result.rows[0][0]; // e.g., "E010"
        let newId;

        if (!maxId) {
            newId = "E001"; // Table empty
        } else {
            const num = parseInt(maxId.slice(1), 10) + 1;
            newId = "E" + num.toString().padStart(3, "0");
        }

        // Insert general info into EMPLOYEE
        const insertEmployeeSql = `
            INSERT INTO EMPLOYEE (EMP_ID, EMP_FNAME, EMP_LNAME, EMP_DOB, EMP_HIRE_DATE, EMP_PHONE, EMP_TYPE)
            VALUES (:id, :fName, :lName, TO_DATE(:dob,'DD/MM/YYYY'), TO_DATE(:hire,'DD/MM/YYYY'), :phone, :type)
        `;

        await connection.execute(insertEmployeeSql, {
            id: newId,
            fName: EMP_FNAME,
            lName: EMP_LNAME,
            dob: EMP_DOB,
            hire: EMP_HIRE_DATE,
            phone: EMP_PHONE,
            type: EMP_TYPE
        }, { autoCommit: true });

        // Insert wage into the correct table
        if (EMP_TYPE === "Full-Time") {
            await connection.execute(
                `INSERT INTO FULL_TIME (EMP_ID, MONTHLY_WAGE) VALUES (:id, :salary)`,
                { id: newId, salary: WAGE },
                { autoCommit: true }
            );
        } else {
            await connection.execute(
                `INSERT INTO PART_TIME (EMP_ID, HOURLY_WAGE) VALUES (:id, :salary)`,
                { id: newId, salary: WAGE },
                { autoCommit: true }
            );
        }

        res.json({ success: true, id: newId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    } finally {
        if (connection) await connection.close();
    }
});

// GET single employee with salary 
app.get('/api/employees/:id', async (req, res) => {
    const id = req.params.id;
    let connection;
    
    try {
        connection = await getConnection();
        
        const result = await connection.execute(
            `SELECT 
                e.EMP_ID,
                e.EMP_TYPE,
                e.EMP_FNAME,
                e.EMP_LNAME,
                e.EMP_DOB,
                e.EMP_HIRE_DATE,
                e.EMP_PHONE,
                COALESCE(f.MONTHLY_WAGE, p.HOURLY_WAGE) AS SALARY
             FROM EMPLOYEE e
             LEFT JOIN FULL_TIME f ON e.EMP_ID = f.EMP_ID
             LEFT JOIN PART_TIME p ON e.EMP_ID = p.EMP_ID
             WHERE e.EMP_ID = :id`,
            { id }
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Employee not found" });
        }
        
        const row = result.rows[0];
        
        const employee = {
            EMP_ID: row[0],
            EMP_TYPE: row[1],
            EMP_FNAME: row[2],
            EMP_LNAME: row[3],
            EMP_DOB: row[4],
            EMP_HIRE_DATE: row[5],
            EMP_PHONE: row[6],
            salary: row[7] ? {
                amount: row[7],
                type: row[1] === 'Full-Time' ? 'Monthly Salary' : 'Hourly Wage',
                frequency: row[1] === 'Full-Time' ? 'month' : 'hour',
                annual: row[1] === 'Full-Time' ? row[7] * 12 : null
            } : null
        };

        // If salary is null, fetch from the correct table
        if (!employee.salary) {
            if (employee.EMP_TYPE === 'Full-Time') {
                const ftCheck = await connection.execute(
                    `SELECT MONTHLY_WAGE FROM FULL_TIME WHERE EMP_ID = :id`,
                    { id }
                );
                if (ftCheck.rows.length > 0) {
                    employee.salary = {
                        amount: ftCheck.rows[0][0],
                        type: 'Monthly Salary',
                        frequency: 'month',
                        annual: ftCheck.rows[0][0] * 12
                    };
                }
            } else if (employee.EMP_TYPE === 'Part-Time') {
                const ptCheck = await connection.execute(
                    `SELECT HOURLY_WAGE FROM PART_TIME WHERE EMP_ID = :id`,
                    { id }
                );
                if (ptCheck.rows.length > 0) {
                    employee.salary = {
                        amount: ptCheck.rows[0][0],
                        type: 'Hourly Wage',
                        frequency: 'hour',
                        annual: null
                    };
                }
            }
        }

        // Send employee data to the client
        res.json(employee);

    } catch (err) {
        console.error("Error fetching employee details:", err);
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) await connection.close();
    }
});

// GET all employees WITH salary 
app.get('/api/employees', async (req, res) => {
    let connection;
    try {
        connection = await getConnection();
        
        // Use your working query for all employees
        const result = await connection.execute(
            `SELECT 
                e.EMP_ID,
                e.EMP_FNAME || ' ' || e.EMP_LNAME AS NAME,
                e.EMP_DOB,
                e.EMP_HIRE_DATE,
                e.EMP_PHONE,
                e.EMP_TYPE,
                COALESCE(f.MONTHLY_WAGE, p.HOURLY_WAGE) AS SALARY
             FROM EMPLOYEE e
             LEFT JOIN FULL_TIME f ON e.EMP_ID = f.EMP_ID
             LEFT JOIN PART_TIME p ON e.EMP_ID = p.EMP_ID
             ORDER BY e.EMP_ID`
        );

        const employees = result.rows.map(row => ({
            id: row[0],
            name: row[1],
            dob: row[2],
            hireDate: row[3],
            phone: row[4],
            type: row[5],
            salary: row[6] // Include salary in the response
        }));

        res.json(employees);
    } catch(err) {
        console.error("Error fetching employees:", err);
        res.status(500).json({ error: err.message });
    } finally {
        if(connection) await connection.close();
    }
});

// DELETE employee by ID

//If the employee is linked to other tables like HOUSEKEEPING, PAYMENT, etc., 
// deletion may fail due to foreign key constraints.
app.delete('/api/employees/:id', async (req, res) => {
  const id = (req.params.id || "").trim().toUpperCase();
  let connection;

  try {
    connection = await getConnection();

    // 1) Check employee exists
    const empCheck = await connection.execute(
      `SELECT COUNT(*) FROM EMPLOYEE WHERE EMP_ID = :id`,
      { id }
    );
    if (empCheck.rows[0][0] === 0) {
      return res.status(404).json({ success: false, error: "Employee not found" });
    }

    // 2) Block delete if referenced in PAYMENT / HOUSEKEEPING
    const payCheck = await connection.execute(
      `SELECT COUNT(*) FROM PAYMENT WHERE EMP_ID = :id`,
      { id }
    );
    if (payCheck.rows[0][0] > 0) {
      return res.status(400).json({
        success: false,
        error: "Cannot delete employee: This employee is referenced in PAYMENT records."
      });
    }

    const hkCheck = await connection.execute(
      `SELECT COUNT(*) FROM HOUSEKEEPING WHERE EMP_ID = :id`,
      { id }
    );
    if (hkCheck.rows[0][0] > 0) {
      return res.status(400).json({
        success: false,
        error: "Cannot delete employee: This employee is referenced in HOUSEKEEPING records."
      });
    }

    // 3) Transaction (delete subtype first, then parent)
    await connection.execute(`DELETE FROM FULL_TIME WHERE EMP_ID = :id`, { id });
    await connection.execute(`DELETE FROM PART_TIME WHERE EMP_ID = :id`, { id });

    const delEmp = await connection.execute(
      `DELETE FROM EMPLOYEE WHERE EMP_ID = :id`,
      { id }
    );

    if (delEmp.rowsAffected === 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: "Delete failed." });
    }

    await connection.commit();
    return res.json({ success: true });

  } catch (err) {
    console.error(err);
    try { if (connection) await connection.rollback(); } catch (e) {}

    // Friendly FK message fallback
    if (String(err.message || "").includes("ORA-02292")) {
      return res.status(400).json({
        success: false,
        error: "Cannot delete employee: it is referenced by other records."
      });
    }

    return res.status(500).json({ success: false, error: err.message });
  } finally {
    if (connection) await connection.close();
  }
});


//------------------------------------------------HOMESTAY------------------------------------------------------------//

// CREATE homestay (your code, kept, just cleaned minor)
app.post('/api/homestays', async (req, res) => {
  const { HOMESTAY_NAME, PRICE_RATE, DESCRIPTIONS, STATUS } = req.body;

  if (!HOMESTAY_NAME || PRICE_RATE == null || !STATUS) {
    return res.status(400).json({ success: false, error: "All fields are required" });
  }

  let connection;

  try {
    connection = await getConnection();

    const result = await connection.execute(
      `SELECT MAX(HOMESTAY_ID) AS MAX_ID FROM HOMESTAY`,
      [],
      { outFormat: require("oracledb").OUT_FORMAT_OBJECT }
    );

    const maxId = result.rows?.[0]?.MAX_ID; // e.g. "H005"
    let newId;

    if (!maxId) {
      newId = "H001";
    } else {
      const num = parseInt(String(maxId).slice(1), 10) + 1;
      newId = "H" + String(num).padStart(3, "0");
    }

    const insertSql = `
      INSERT INTO HOMESTAY (HOMESTAY_ID, HOMESTAY_NAME, PRICE_RATE, DESCRIPTIONS, STATUS)
      VALUES (:id, :hName, :hRate, :hDesc, :hStatus)
    `;

    await connection.execute(
      insertSql,
      {
        id: newId,
        hName: HOMESTAY_NAME,
        hRate: Number(PRICE_RATE),
        hDesc: DESCRIPTIONS ?? "",
        hStatus: String(STATUS).toUpperCase()
      }
    );

    await connection.commit();
    return res.json({ success: true, id: newId });

  } catch (err) {
    console.error("POST /api/homestays error:", err);
    try { if (connection) await connection.rollback(); } catch (e) {}
    return res.status(500).json({ success: false, error: err.message });

  } finally {
    try { if (connection) await connection.close(); } catch (e) {}
  }
});


// GET single homestay by ID
app.get('/api/homestays/:id', async (req, res) => {
    const id = req.params.id;
    let connection;
    try {
        connection = await getConnection();
        const result = await connection.execute(
            `SELECT HOMESTAY_ID, HOMESTAY_NAME, PRICE_RATE, DESCRIPTIONS, STATUS
             FROM HOMESTAY
             WHERE HOMESTAY_ID = :id`,
            { id }
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Homestay not found" });
        }

        const row = result.rows[0];
        const homestay = {
            id: row[0],
            name: row[1],
            price: row[2],
            description: row[3],
            status: row[4]
        };

        res.json(homestay);

    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        if(connection) await connection.close();
    }
});

// GET all homestays along with latest housekeeping status
app.get("/api/homestays", async (req, res) => {
  let connection;

  const includeHK = String(req.query.includeHK || "").toLowerCase() === "true";

  const hsStatus = String(req.query.status || "").trim().toUpperCase();      // AVAILABLE/UNAVAILABLE
  const hkStatus = String(req.query.hkStatus || "").trim().toUpperCase();    // COMPLETED/(NONE)/...
  const yearRaw = String(req.query.year || "").trim();
  const year = yearRaw ? Number(yearRaw) : null;

  const minRevenue = Number(req.query.minRevenue || 0);
  const maxRevenueRaw = String(req.query.maxRevenue || "").trim();
  const maxRevenue = maxRevenueRaw ? Number(maxRevenueRaw) : null;

  try {
    connection = await getConnection();

    const sql = `
      SELECT
        h.HOMESTAY_ID,
        h.HOMESTAY_NAME,
        h.PRICE_RATE,
        h.DESCRIPTIONS,
        h.STATUS AS HOMESTAY_STATUS,

        hk.HK_STATUS,

        NVL(rv.TOTAL_REVENUE, 0) AS TOTAL_REVENUE

      FROM HOMESTAY h

      -- latest housekeeping per homestay
      LEFT JOIN (
        SELECT HOMESTAY_ID, STATUS AS HK_STATUS
        FROM (
          SELECT
            HOMESTAY_ID,
            STATUS,
            HK_DATE,
            HOUSEKEEP_ID,
            ROW_NUMBER() OVER (
              PARTITION BY HOMESTAY_ID
              ORDER BY HK_DATE DESC NULLS LAST, HOUSEKEEP_ID DESC
            ) AS rn
          FROM HOUSEKEEPING
        )
        WHERE rn = 1
      ) hk ON hk.HOMESTAY_ID = h.HOMESTAY_ID

      -- revenue per homestay (PAID only)
      LEFT JOIN (
        SELECT
          b.HOMESTAY_ID,
          SUM(p.TOTAL_PRICE) AS TOTAL_REVENUE
        FROM BOOKING b
        JOIN PAYMENT p ON p.BOOKING_ID = b.BOOKING_ID
        WHERE UPPER(p.PAY_STATUS) = 'PAID'
          AND p.PAYMENT_DATE IS NOT NULL
          AND (:year IS NULL OR EXTRACT(YEAR FROM p.PAYMENT_DATE) = :year)
        GROUP BY b.HOMESTAY_ID
      ) rv ON rv.HOMESTAY_ID = h.HOMESTAY_ID

      WHERE (:hsStatus IS NULL OR UPPER(h.STATUS) = :hsStatus)
        AND (:hkStatus IS NULL OR UPPER(NVL(hk.HK_STATUS,'(NONE)')) = :hkStatus)
        AND NVL(rv.TOTAL_REVENUE, 0) >= :minRevenue
        AND (:maxRevenue IS NULL OR NVL(rv.TOTAL_REVENUE, 0) <= :maxRevenue)

      ORDER BY h.HOMESTAY_ID
    `;

    const binds = {
      hsStatus: hsStatus ? hsStatus : null,
      hkStatus: hkStatus ? hkStatus : null,
      year: year && !Number.isNaN(year) ? year : null,
      minRevenue: Number.isNaN(minRevenue) ? 0 : minRevenue,
      maxRevenue: maxRevenue !== null && !Number.isNaN(maxRevenue) ? maxRevenue : null
    };

    const result = await connection.execute(
      sql,
      binds,
      { outFormat: require("oracledb").OUT_FORMAT_OBJECT }
    );

    const rows = result.rows || [];

    const payload = rows.map(r => ({
      id: r.HOMESTAY_ID,
      name: r.HOMESTAY_NAME,
      price: r.PRICE_RATE,
      description: r.DESCRIPTIONS,
      status: r.HOMESTAY_STATUS,
      totalRevenue: Number(r.TOTAL_REVENUE || 0),
      ...(includeHK ? { hkStatus: r.HK_STATUS || "(NONE)" } : {})
    }));

    return res.json(payload);

  } catch (err) {
    console.error("GET /api/homestays error:", err);
    return res.status(500).json({ success: false, error: err.message });
  } finally {
    try { if (connection) await connection.close(); } catch (e) {}
  }
});



// PUT update homestay by ID
app.put('/api/homestays/:id', async (req, res) => {
  const id = (req.params.id || "").trim().toUpperCase();
  const { HOMESTAY_NAME, PRICE_RATE, DESCRIPTIONS, STATUS } = req.body;

  if (!id) {
    return res.status(400).json({ success: false, error: "Missing homestay id." });
  }

  if (!HOMESTAY_NAME || !PRICE_RATE || !STATUS) {
    return res.status(400).json({ success: false, error: "HOMESTAY_NAME, PRICE_RATE and STATUS are required." });
  }

  const rate = Number(PRICE_RATE);
  if (Number.isNaN(rate) || rate <= 0) {
    return res.status(400).json({ success: false, error: "PRICE_RATE must be a number > 0." });
  }

  let connection;
  try {
    connection = await getConnection();

    const upd = await connection.execute(
      `UPDATE HOMESTAY
       SET HOMESTAY_NAME = :hName,
           PRICE_RATE = :hRate,
           DESCRIPTIONS = :hDesc,
           STATUS = :hStatus
       WHERE HOMESTAY_ID = :id`,
      {
        hName: String(HOMESTAY_NAME).trim(),
        hRate: rate,
        hDesc: (DESCRIPTIONS ?? "").toString(),   // allow empty
        hStatus: String(STATUS).trim().toUpperCase(),
        id
      },
      { autoCommit: true }
    );

    if (upd.rowsAffected === 0) {
      return res.status(404).json({ success: false, error: "Homestay not found" });
    }

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    if (connection) await connection.close();
  }
});


// DELETE homestay by ID with rule check (Oracle)
app.delete('/api/homestays/:id', async (req, res) => {
  const id = String(req.params.id || "").trim().toUpperCase();
  let connection;

  if (!id) {
    return res.status(400).json({ success: false, error: "Missing homestay id." });
  }

  try {
    connection = await getConnection();

    // 0) check homestay exists
    const exists = await connection.execute(
      `SELECT COUNT(*) FROM HOMESTAY WHERE HOMESTAY_ID = :id`,
      { id }
    );

    if (exists.rows[0][0] === 0) {
      return res.status(404).json({ success: false, error: "Homestay not found." });
    }

    // 1) Check if homestay is referenced in BOOKING
    const bookingCheck = await connection.execute(
      `SELECT COUNT(*) FROM BOOKING WHERE HOMESTAY_ID = :id`,
      { id }
    );

    if (bookingCheck.rows[0][0] > 0) {
      return res.status(400).json({
        success: false,
        error: "Cannot delete homestay. It is referenced in one or more bookings."
      });
    }

    // 2) Check if homestay is referenced in HOUSEKEEPING
    const housekeepingCheck = await connection.execute(
      `SELECT COUNT(*) FROM HOUSEKEEPING WHERE HOMESTAY_ID = :id`,
      { id }
    );

    if (housekeepingCheck.rows[0][0] > 0) {
      return res.status(400).json({
        success: false,
        error: "Cannot delete homestay. It is referenced in housekeeping records."
      });
    }

    // 3) Safe to delete
    const del = await connection.execute(
      `DELETE FROM HOMESTAY WHERE HOMESTAY_ID = :id`,
      { id },
      { autoCommit: true }
    );

    if (del.rowsAffected === 0) {
      return res.status(404).json({ success: false, error: "Homestay not found." });
    }

    return res.json({ success: true });

  } catch (err) {
    console.error("Delete homestay error:", err);

    // Friendly FK message
    if (String(err.message || "").includes("ORA-02292")) {
      return res.status(400).json({
        success: false,
        error: "Cannot delete homestay because it is referenced by other records."
      });
    }

    return res.status(500).json({ success: false, error: err.message });

  } finally {
    try { if (connection) await connection.close(); } catch (e) {}
  }
});



//------------------------------------------------PAYMENT------------------------------------------------------------//
// GET single payment record by ID
app.get('/api/payment/:id', async (req, res) => {
  const id = (req.params.id || "").trim().toUpperCase();
  let connection;

  try {
    connection = await getConnection();

    const result = await connection.execute(
      `SELECT 
          p.PAY_ID,
          p.BOOKING_ID,
          p.EMP_ID,
          p.TOTAL_PRICE,
          p.PAY_STATUS,
          p.PAYMENT_DATE,
          p.PAYMENT_METHOD
       FROM PAYMENT p
       WHERE p.PAY_ID = :id`,
      { id }
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Payment record not found" });
    }

    const row = result.rows[0];
    res.json({
      id: row[0],
      bookingId: row[1],
      empId: row[2],
      totalPrice: row[3],
      status: row[4],
      paymentDate: row[5],
      method: row[6]
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) await connection.close();
  }
});


// Fetch all payments
app.get('/api/paymentsALL', async (req,res)=>{
    let connection;
    try {
        connection = await getConnection();
        const result = await connection.execute(
            `SELECT 
                p.PAY_ID,
                b.BOOKING_ID,
                e.EMP_ID,
                p.TOTAL_PRICE,
                p.PAY_STATUS,
                p.PAYMENT_DATE,
                p.PAYMENT_METHOD,
                r.RECEIPT_NO
            FROM PAYMENT p
            LEFT JOIN BOOKING b ON p.BOOKING_ID = b.BOOKING_ID
            LEFT JOIN EMPLOYEE e ON p.EMP_ID = e.EMP_ID
            LEFT JOIN RECEIPT r ON p.PAY_ID = r.PAY_ID
            ORDER BY p.PAYMENT_DATE DESC`
        );

        // Map to objects for easier frontend usage
        const payment = result.rows.map(row => ({
            id: row[0],
            bookingId: row[1] || "-",
            employeeId: row[2] || "-",
            totalPrice: row[3] || "-",
            status: row[4] || "-",
            paymentDate: row[5] || "-",
            method: row[6] || "-",
            receiptNo: row[7] || "-"
        }));

        res.json(payment);

    } catch(err){ 
        res.status(500).json({error: err.message}); 
    } finally { 
        if(connection) await connection.close(); 
    }
});

// Update 
app.put('/api/paymentUpdate/:id', async (req, res) => {
  const payId = (req.params.id || "").trim().toUpperCase();
  const { EMP_ID, PAYMENT_DATE, PAY_STATUS, PAYMENT_METHOD } = req.body;

  if (!EMP_ID || !PAY_STATUS || !PAYMENT_METHOD) {
    return res.status(400).json({
      success: false,
      error: "EMP_ID, PAY_STATUS and PAYMENT_METHOD are required"
    });
  }

  const status = String(PAY_STATUS).toUpperCase();

  if (status === "PAID" && !PAYMENT_DATE) {
    return res.status(400).json({
      success: false,
      error: "PAYMENT_DATE is required when status is PAID"
    });
  }

  let connection;

  try {
    connection = await getConnection();

    // Check payment exists + get current status
    const checkResult = await connection.execute(
      `SELECT PAY_STATUS FROM PAYMENT WHERE PAY_ID = :payId`,
      { payId }
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Payment not found" });
    }

    // Update PAYMENT
    await connection.execute(
      `UPDATE PAYMENT
       SET EMP_ID = :empId,
           PAY_STATUS = :payStatus,
           PAYMENT_DATE = CASE
             WHEN :payDate IS NULL OR :payDate = '' THEN NULL
             ELSE TO_DATE(:payDate,'YYYY-MM-DD')
           END,
           PAYMENT_METHOD = :payMethod
       WHERE PAY_ID = :payId`,
      {
        empId: String(EMP_ID).trim().toUpperCase(),
        payStatus: status,
        payDate: PAYMENT_DATE || null,
        payMethod: String(PAYMENT_METHOD).trim().toUpperCase(),
        payId
      }
    );

    // If status is PAID -> UPSERT RECEIPT (insert if missing, else update date)
    if (status === "PAID") {
      const receiptCheck = await connection.execute(
        `SELECT RECEIPT_NO FROM RECEIPT WHERE PAY_ID = :payId`,
        { payId }
      );

      if (receiptCheck.rows.length === 0) {
        // Generate new receipt no
        const maxRes = await connection.execute(`SELECT MAX(RECEIPT_NO) FROM RECEIPT`);
        const maxNo = maxRes.rows[0][0];
        const newNo = maxNo
          ? "R" + (parseInt(maxNo.slice(1), 10) + 1).toString().padStart(3, "0")
          : "R001";

        await connection.execute(
          `INSERT INTO RECEIPT (RECEIPT_NO, PAY_ID, RECEIPT_DATE)
           VALUES (:rNo, :payId, TO_DATE(:rDate,'YYYY-MM-DD'))`,
          { rNo: newNo, payId, rDate: PAYMENT_DATE }
        );
      } else {
        // Update existing receipt date
        await connection.execute(
          `UPDATE RECEIPT
           SET RECEIPT_DATE = TO_DATE(:rDate,'YYYY-MM-DD')
           WHERE PAY_ID = :payId`,
          { rDate: PAYMENT_DATE, payId }
        );
      }
    }

    await connection.commit();
    res.json({ success: true, message: "Payment updated successfully" });

  } catch (err) {
    console.error(err);
    try { if (connection) await connection.rollback(); } catch (e) {}
    res.status(500).json({ success: false, error: err.message });
  } finally {
    if (connection) await connection.close();
  }
});


//------------------------------------------------RECEIPT------------------------------------------------------------//
// Get all the info for the receipt
app.get('/api/receipt/:id', async (req, res) => {
    const id = req.params.id;
    let connection;

    try {
        connection = await getConnection();

        const result = await connection.execute(
            `SELECT 
                r.RECEIPT_NO,
                r.RECEIPT_DATE,
                p.PAY_STATUS,
                c.CUST_FNAME || ' ' || NVL(c.CUST_LNAME,'') AS CUST_NAME,
                c.CUST_PHONE,
                p.BOOKING_ID,
                b.CHECKIN,
                b.CHECKOUT,
                b.TOTAL_NIGHT,
                p.PAY_ID,
                p.PAYMENT_METHOD,
                p.PAYMENT_DATE,
                p.TOTAL_PRICE
            FROM RECEIPT r
            LEFT JOIN PAYMENT p ON r.PAY_ID = p.PAY_ID
            LEFT JOIN BOOKING b ON p.BOOKING_ID = b.BOOKING_ID
            LEFT JOIN CUSTOMER c ON b.CUST_ID = c.CUST_ID
            WHERE r.RECEIPT_NO = :id`,
            { id }
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Receipt record not found" });
        }

        const row = result.rows[0];
        const receipt = {
            id: row[0],
            rDate: row[1],
            rStatus: row[2],
            rCustomerName: row[3],
            rCustomerPhone: row[4],
            rBookingId: row[5],
            rCheckinDate: row[6],
            rCheckoutDate: row[7],
            rNight: row[8],
            rPaymentId: row[9],
            rPaymentMethod: row[10],
            rPaymentDate: row[11],
            rTotalAmount: row[12]
        };

        res.json(receipt);

    } catch(err) { 
        console.error("Server error while fetching receipt:", err);
        res.status(500).json({ error: err.message, stack: err.stack });
    } finally { 
        if(connection) await connection.close(); 
    }
});

// Get the item booking one by one
app.get('/api/receiptBooking/:id', async (req, res) => {
    const id = req.params.id;
    let connection;

    try {
        connection = await getConnection();

        const result = await connection.execute(
            `SELECT 
                i.ITEM_NAME,
                i.RATE_TYPE,
                i.ITEM_RATE,
                bk.USAGE_QUANTITY,
                bk.SUBTOTAL
            FROM RECEIPT r
            INNER JOIN PAYMENT p ON r.PAY_ID = p.PAY_ID
            INNER JOIN BOOKING b ON p.BOOKING_ID = b.BOOKING_ID
            INNER JOIN BOOKINGITEM bk ON b.BOOKING_ID = bk.BOOKING_ID
            INNER JOIN ITEM i ON bk.ITEM_NO = i.ITEM_NO
            WHERE r.RECEIPT_NO = :id`,
            { id }
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Receipt booking record not found" });
        }

        const items = result.rows.map(row => ({
            itemName: row[0],
            rateType: row[1],
            itemRate: row[2],
            usageQty: row[3],
            subTotal: row[4]
        }));

        res.json(items);

    } catch (err) {
        console.error("Server error while fetching receipt booking:", err);
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) await connection.close();
    }
});

// GET /api/receipt/check/:payId
app.get('/api/receipt/check/:payId', async (req, res) => {
    const payId = req.params.payId;
    let connection;

    try {
        connection = await getConnection();

        const result = await connection.execute(
            `SELECT COUNT(*) AS COUNT
             FROM RECEIPT
             WHERE PAY_ID = :payId`,
            { payId }
        );

        const exists = result.rows[0][0] > 0; // true if count > 0
        res.json({ exists });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) await connection.close();
    }
});

// POST /api/receipt
app.post('/api/receipt', async (req, res) => {
    const { PAY_ID, RECEIPT_DATE } = req.body;

    if (!PAY_ID || !RECEIPT_DATE) {
        return res.status(400).json({ success: false, error: "All fields are required" });
    }

    let connection;

    try {
        connection = await getConnection();

        // Check if receipt already exists
        const check = await connection.execute(
            `SELECT COUNT(*) AS COUNT FROM RECEIPT WHERE PAY_ID = :payId`,
            { payId: PAY_ID }
        );

        if (check.rows[0][0] > 0) {
            return res.json({ success: false, error: "Receipt already exists" });
        }

        // Generate RECEIPT_NO (auto-increment style)
        const maxRes = await connection.execute(
            `SELECT MAX(RECEIPT_NO) AS MAX_NO FROM RECEIPT`
        );

        let maxNo = maxRes.rows[0][0];
        let newNo = maxNo
            ? "R" + (parseInt(maxNo.slice(1), 10) + 1).toString().padStart(3, "0")
            : "R001";

        // Insert receipt
        await connection.execute(
            `INSERT INTO RECEIPT (RECEIPT_NO, PAY_ID, RECEIPT_DATE)
             VALUES (:rNo, :payId, :rDate)`,
            { rNo: newNo, payId: PAY_ID, rDate: RECEIPT_DATE },
            { autoCommit: true }
        );

        res.json({ success: true, receiptNo: newNo });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    } finally {
        if (connection) await connection.close();
    }
});

//------------------------------------------------BOOKING------------------------------------------------------------//

// Fetch all booking
app.get('/api/bookingALL', async (req, res) => {
  let connection;

  const payStatus = String(req.query.payStatus || "").trim().toUpperCase(); // PAID/PENDING
  const custId = String(req.query.custId || "").trim().toUpperCase(); // C001
  const minGrandTotal = Number(req.query.minGrandTotal || 0); // 200

  try {
    connection = await getConnection();

    const sql = `
      SELECT
        b.BOOKING_ID,
        b.BOOKING_DATE,
        c.CUST_FNAME || ' ' || NVL(c.CUST_LNAME,'') AS CUST_NAME,
        b.CUST_ID,

        b.HOMESTAY_ID,
        h.HOMESTAY_NAME,
        h.PRICE_RATE,

        b.CHECKIN,
        b.CHECKOUT,
        b.TOTAL_NIGHT,

        NVL(p.PAY_STATUS, 'PENDING') AS PAY_STATUS,

        -- computed totals (complexity)
        (b.TOTAL_NIGHT * h.PRICE_RATE) AS HOMESTAY_TOTAL,

        NVL((
          SELECT SUM(bk.SUBTOTAL)
          FROM BOOKINGITEM bk
          WHERE bk.BOOKING_ID = b.BOOKING_ID
        ), 0) AS ITEMS_TOTAL,

        (b.TOTAL_NIGHT * h.PRICE_RATE) +
        NVL((
          SELECT SUM(bk.SUBTOTAL)
          FROM BOOKINGITEM bk
          WHERE bk.BOOKING_ID = b.BOOKING_ID
        ), 0) AS GRAND_TOTAL

      FROM BOOKING b
      JOIN HOMESTAY h ON b.HOMESTAY_ID = h.HOMESTAY_ID
      JOIN CUSTOMER c ON b.CUST_ID = c.CUST_ID
      LEFT JOIN PAYMENT p ON p.BOOKING_ID = b.BOOKING_ID

      WHERE (:custId IS NULL OR b.CUST_ID = :custId)
        AND (:payStatus IS NULL OR UPPER(NVL(p.PAY_STATUS,'PENDING')) = :payStatus)
        AND (
          (b.TOTAL_NIGHT * h.PRICE_RATE) +
          NVL((
            SELECT SUM(bk.SUBTOTAL)
            FROM BOOKINGITEM bk
            WHERE bk.BOOKING_ID = b.BOOKING_ID
          ), 0)
        ) >= :minGrandTotal

      GROUP BY b.BOOKING_ID, b.BOOKING_DATE, c.CUST_FNAME || ' ' || NVL(c.CUST_LNAME,''), b.CUST_ID, b.HOMESTAY_ID, 
      h.HOMESTAY_NAME, h.PRICE_RATE, b.CHECKIN, b.CHECKOUT, b.TOTAL_NIGHT, 
      NVL(p.PAY_STATUS, 'PENDING'), (b.TOTAL_NIGHT * h.PRICE_RATE)

      ORDER BY b.CHECKIN DESC
    `;

    const binds = {
      custId: custId ? custId : null,
      payStatus: payStatus ? payStatus : null,
      minGrandTotal: Number.isNaN(minGrandTotal) ? 0 : minGrandTotal
    };

    const result = await connection.execute(sql, binds);

    const booking = result.rows.map(row => ({
      bookingId: row[0],
      bookingDate: row[1],
      custName: row[2],
      custId: row[3],
      homestayId: row[4],
      homestayName: row[5],
      priceRate: row[6],
      checkinDate: row[7],
      checkoutDate: row[8],
      totalNight: row[9],
      payStatus: row[10],
      homestayTotal: row[11],
      itemsTotal: row[12],
      grandTotal: row[13]
    }));

    res.json(booking);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) await connection.close();
  }
});



// Get the booking view one by one
app.get('/api/bookingView/:id', async (req, res) => {
    const id = req.params.id;
    let connection;

    try {
        connection = await getConnection();

        const result = await connection.execute(
            `SELECT
                c.CUST_FNAME || ' ' || c.CUST_LNAME AS CUST_NAME,
                h.HOMESTAY_NAME || ' (RM' || h.PRICE_RATE || ' / night)' AS HOMESTAY_NAME,
                h.PRICE_RATE,
                b.CHECKIN,
                b.CHECKOUT,
                b.TOTAL_NIGHT,
                (b.TOTAL_NIGHT * h.PRICE_RATE) AS HOMESTAY_TOTAL,
                bk.SUBTOTAL,
                p.TOTAL_PRICE
            FROM BOOKING b
            JOIN BOOKINGITEM bk ON b.BOOKING_ID = bk.BOOKING_ID
            JOIN PAYMENT p ON b.BOOKING_ID = p.BOOKING_ID
            JOIN HOMESTAY h ON b.HOMESTAY_ID = h.HOMESTAY_ID
            JOIN CUSTOMER c ON b.CUST_ID = c.CUST_ID
            WHERE b.BOOKING_ID = :id`,
            { id }
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Single booking record not found" });
        }

        const row = result.rows[0];

        const bookingOne = {
            customerName: row[0],
            homestayName: row[1],
            priceRate: row[2],
            checkIn: row[3],
            checkOut: row[4],
            totalNight: row[5],
            homestayTotal: row[6],
            subTotal: row[7],
            totalPrice: row[8]
        };

        res.json(bookingOne);

    } catch (err) {
        console.error("Server error while fetching a single booking view:", err);
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) await connection.close();
    }
});

// Get the item booking one by one
app.get('/api/bookingItem/:id', async (req, res) => {
  const id = req.params.id;
  let connection;

  try {
    connection = await getConnection();

    const result = await connection.execute(
      `SELECT 
          bk.ITEM_NO,
          i.ITEM_NAME,
          i.RATE_TYPE,
          i.ITEM_RATE,
          bk.USAGE_QUANTITY,
          bk.SUBTOTAL
       FROM BOOKINGITEM bk
       JOIN ITEM i ON bk.ITEM_NO = i.ITEM_NO
       WHERE bk.BOOKING_ID = :id`,
      { id }
    );

    // return empty array if none
    const items = result.rows.map(row => ({
      itemNo: row[0],
      itemName: row[1],
      rateType: row[2],
      itemRate: row[3],
      usageQty: row[4],
      subTotal: row[5]
    }));

    res.json(items);

  } catch (err) {
    console.error("Error fetching booking items:", err);
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

// DELETE booking by ID (also deletes related PAYMENT + RECEIPT + BOOKINGITEM)
app.delete('/api/bookings/:id', async (req, res) => {
  const id = String(req.params.id || "").trim().toUpperCase();
  let connection;

  if (!id) {
    return res.status(400).json({ success: false, error: "Missing booking id." });
  }

  try {
    connection = await getConnection();

    // 1) Check booking exists
    const chkBooking = await connection.execute(
      `SELECT COUNT(*) FROM BOOKING WHERE BOOKING_ID = :id`,
      { id }
    );

    if (chkBooking.rows[0][0] === 0) {
      return res.status(404).json({ success: false, error: "Booking not found." });
    }

    // 2) Block delete if payment is PAID (keep revenue/history)
    const chkPaid = await connection.execute(
      `SELECT COUNT(*)
       FROM PAYMENT
       WHERE BOOKING_ID = :id
         AND UPPER(PAY_STATUS) = 'PAID'`,
      { id }
    );

    if (chkPaid.rows[0][0] > 0) {
      return res.status(400).json({
        success: false,
        error: "Cannot delete booking: payment status is PAID."
      });
    }

    // ---------- TRANSACTION START ----------
    // (In node-oracledb, autocommit is false by default. We'll commit manually.)
    // 3) Delete RECEIPT(s) for payments under this booking
    //    RECEIPT references PAYMENT via PAY_ID
    await connection.execute(
      `DELETE FROM RECEIPT
       WHERE PAY_ID IN (
         SELECT PAY_ID FROM PAYMENT WHERE BOOKING_ID = :id
       )`,
      { id }
    );

    // 4) Delete PAYMENT(s) under this booking
    await connection.execute(
      `DELETE FROM PAYMENT WHERE BOOKING_ID = :id`,
      { id }
    );

    // 5) Delete BOOKINGITEM(s) under this booking
    await connection.execute(
      `DELETE FROM BOOKINGITEM WHERE BOOKING_ID = :id`,
      { id }
    );

    // 6) Finally delete BOOKING
    const delBooking = await connection.execute(
      `DELETE FROM BOOKING WHERE BOOKING_ID = :id`,
      { id }
    );

    if (delBooking.rowsAffected === 0) {
      await connection.rollback();
      return res.status(500).json({ success: false, error: "Delete failed (booking not removed)." });
    }

    await connection.commit();

    return res.json({
      success: true,
      message: "Booking deleted successfully (including related payment/receipt/items)."
    });

  } catch (err) {
    console.error("Delete booking error:", err);

    try { if (connection) await connection.rollback(); } catch (e) {}

    // FK constraint
    if (String(err.message || "").includes("ORA-02292")) {
      return res.status(400).json({
        success: false,
        error: "Cannot delete booking: it is referenced in other records."
      });
    }

    return res.status(500).json({ success: false, error: err.message });

  } finally {
    try { if (connection) await connection.close(); } catch (e) {}
  }
});



// ------------------------------------ CREATE BOOKING (BOOKING + PAYMENT + BOOKINGITEM) ------------------------------------
app.post('/api/bookings', async (req, res) => {
  const {
    CUST_ID,
    HOMESTAY_ID,
    CHECKIN,
    CHECKOUT,
    TOTAL_NIGHT,
    TOTAL_PRICE,
    PAY_STATUS,
    ITEMS
  } = req.body;

  // Basic validation
  if (!CUST_ID || !HOMESTAY_ID || !CHECKIN || !CHECKOUT || !TOTAL_NIGHT || !TOTAL_PRICE) {
    return res.status(400).json({ success: false, error: "Missing required fields." });
  }

  let connection;

  try {
    connection = await getConnection();

    // ------------------ Generate BOOKING_ID ------------------
    const bRes = await connection.execute(`SELECT MAX(BOOKING_ID) FROM BOOKING`);
    const maxBooking = bRes.rows[0][0]; // e.g. "B005"
    const nextBooking = maxBooking
      ? "B" + (parseInt(maxBooking.slice(1), 10) + 1).toString().padStart(3, "0")
      : "B001";

    // ------------------ Generate PAY_ID ------------------
    const pRes = await connection.execute(`SELECT MAX(PAY_ID) FROM PAYMENT`);
    const maxPay = pRes.rows[0][0]; // e.g. "P010"
    const nextPay = maxPay
      ? "P" + (parseInt(maxPay.slice(1), 10) + 1).toString().padStart(3, "0")
      : "P001";

    // ------------------ Insert BOOKING ------------------
    await connection.execute(
      `INSERT INTO BOOKING (BOOKING_ID, CUST_ID, HOMESTAY_ID, BOOKING_DATE, CHECKIN, CHECKOUT, TOTAL_NIGHT)
       VALUES (:bookingId, :custId, :homestayId, SYSDATE, TO_DATE(:checkin,'YYYY-MM-DD'), TO_DATE(:checkout,'YYYY-MM-DD'), :totalNight)`,
      {
        bookingId: nextBooking,
        custId: CUST_ID,
        homestayId: HOMESTAY_ID,
        checkin: CHECKIN,
        checkout: CHECKOUT,
        totalNight: Number(TOTAL_NIGHT)
      }
    );

    // ------------------ Insert PAYMENT (PENDING) ------------------
    await connection.execute(
      `INSERT INTO PAYMENT (PAY_ID, EMP_ID, BOOKING_ID, TOTAL_PRICE, PAY_STATUS, PAYMENT_DATE, PAYMENT_METHOD)
       VALUES (:payId, NULL, :bookingId, :totalPrice, :payStatus, NULL, NULL)`,
      {
        payId: nextPay,
        bookingId: nextBooking,
        totalPrice: Number(TOTAL_PRICE),
        payStatus: (PAY_STATUS || "PENDING").toUpperCase()
      }
    );

    // ------------------ Insert BOOKINGITEM ------------------
    if (Array.isArray(ITEMS) && ITEMS.length > 0) {
      for (const it of ITEMS) {
        if (!it.ITEM_NO) continue;

        await connection.execute(
          `INSERT INTO BOOKINGITEM (BOOKING_ID, ITEM_NO, SUBTOTAL, USAGE_QUANTITY)
           VALUES (:bookingId, :itemNo, :subtotal, :qty)`,
          {
            bookingId: nextBooking,
            itemNo: it.ITEM_NO,
            subtotal: Number(it.SUBTOTAL || 0),
            qty: Number(it.USAGE_QUANTITY || 1)
          }
        );
      }
    }

    // Commit once at end
    await connection.commit();

    res.json({ success: true, bookingId: nextBooking, payId: nextPay });

  } catch (err) {
    console.error(err);

    // rollback if something fails
    try { if (connection) await connection.rollback(); } catch(e) {}

    res.status(500).json({ success: false, error: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

// UPDATE booking + payment + booking items
app.put('/api/bookings/:id', async (req, res) => {
  const id = (req.params.id || "").trim().toUpperCase();

  const {
    CUST_ID,
    HOMESTAY_ID,
    CHECKIN,
    CHECKOUT,
    TOTAL_NIGHT,
    TOTAL_PRICE,
    ITEMS
  } = req.body;

  // Basic validation
  if (!id) {
    return res.status(400).json({ success: false, error: "Missing booking id in URL." });
  }

  if (!CUST_ID || !HOMESTAY_ID || !CHECKIN || !CHECKOUT || !TOTAL_NIGHT || !TOTAL_PRICE) {
    return res.status(400).json({ success: false, error: "Missing required fields." });
  }

  let connection;

  try {
    connection = await getConnection();

    // Check booking exists
    const check = await connection.execute(
      `SELECT COUNT(*) FROM BOOKING WHERE BOOKING_ID = :id`,
      { id }
    );

    if (check.rows[0][0] === 0) {
      return res.status(404).json({ success: false, error: "Booking not found." });
    }

    // Update BOOKING
    await connection.execute(
      `UPDATE BOOKING
       SET CUST_ID = :custId,
           HOMESTAY_ID = :homestayId,
           CHECKIN = TO_DATE(:checkin,'YYYY-MM-DD'),
           CHECKOUT = TO_DATE(:checkout,'YYYY-MM-DD'),
           TOTAL_NIGHT = :totalNight
       WHERE BOOKING_ID = :id`,
      {
        custId: String(CUST_ID).trim(),
        homestayId: String(HOMESTAY_ID).trim(),
        checkin: CHECKIN,
        checkout: CHECKOUT,
        totalNight: Number(TOTAL_NIGHT),
        id
      }
    );

    // Update PAYMENT (TOTAL_PRICE) for this booking
    const payUpd = await connection.execute(
      `UPDATE PAYMENT
       SET TOTAL_PRICE = :totalPrice
       WHERE BOOKING_ID = :id`,
      { totalPrice: Number(TOTAL_PRICE), id }
    );

    // If booking exists but payment row missing, stop (data integrity)
    if (payUpd.rowsAffected === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        error: "Payment record not found for this booking."
      });
    }

    // Replace BOOKINGITEM rows (delete then insert)
    await connection.execute(
      `DELETE FROM BOOKINGITEM WHERE BOOKING_ID = :id`,
      { id }
    );

    // Insert booking items again
    if (Array.isArray(ITEMS) && ITEMS.length > 0) {
      for (const it of ITEMS) {
        if (!it.ITEM_NO) continue;

        await connection.execute(
          `INSERT INTO BOOKINGITEM (BOOKING_ID, ITEM_NO, SUBTOTAL, USAGE_QUANTITY)
           VALUES (:bookingId, :itemNo, :subtotal, :qty)`,
          {
            bookingId: id,
            itemNo: String(it.ITEM_NO).trim(),
            subtotal: Number(it.SUBTOTAL || 0),
            qty: Number(it.USAGE_QUANTITY || 1)
          }
        );
      }
    }

    await connection.commit();
    res.json({ success: true });

  } catch (err) {
    console.error(err);
    try { if (connection) await connection.rollback(); } catch (e) {}
    res.status(500).json({ success: false, error: err.message });
  } finally {
    if (connection) await connection.close();
  }
});


app.get('/api/bookingEdit/:id', async (req, res) => {
  const id = req.params.id;
  let connection;

  try {
    connection = await getConnection();

    const result = await connection.execute(
      `SELECT 
          b.CUST_ID,
          b.HOMESTAY_ID,
          TO_CHAR(b.CHECKIN,'YYYY-MM-DD') AS CHECKIN,
          TO_CHAR(b.CHECKOUT,'YYYY-MM-DD') AS CHECKOUT,
          b.TOTAL_NIGHT,
          NVL(p.TOTAL_PRICE, 0) AS TOTAL_PRICE
       FROM BOOKING b
       LEFT JOIN PAYMENT p ON p.BOOKING_ID = b.BOOKING_ID
       WHERE b.BOOKING_ID = :id`,
      { id }
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const r = result.rows[0];
    res.json({
      customerId: r[0],
      homestayId: r[1],
      checkIn: r[2],
      checkOut: r[3],
      totalNight: r[4],
      totalPrice: r[5]
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) await connection.close();
  }
});



// ------------------------------------------------REPORT------------------------------------------------------------//

// 1) Payments list for selected year (JOIN necessary tables for context)
app.get('/api/payments', async (req, res) => {
  const year = Number(req.query.year);
  let connection;

  if (!year || Number.isNaN(year)) {
    return res.status(400).json({ error: "Valid 'year' query param is required." });
  }

  try {
    connection = await getConnection();

    const result = await connection.execute(
      `SELECT
          p.TOTAL_PRICE,
          p.PAY_STATUS,
          p.PAYMENT_DATE,
          p.PAY_ID,
          b.BOOKING_ID,
          c.CUST_FNAME || ' ' || NVL(c.CUST_LNAME,'') AS CUST_NAME,
          h.HOMESTAY_NAME,
          e.EMP_FNAME || ' ' || NVL(e.EMP_LNAME,'') AS EMP_NAME,
          r.RECEIPT_NO
       FROM PAYMENT p
       JOIN BOOKING b ON p.BOOKING_ID = b.BOOKING_ID
       JOIN CUSTOMER c ON b.CUST_ID = c.CUST_ID
       JOIN HOMESTAY h ON b.HOMESTAY_ID = h.HOMESTAY_ID
       LEFT JOIN EMPLOYEE e ON p.EMP_ID = e.EMP_ID
       LEFT JOIN RECEIPT r ON r.PAY_ID = p.PAY_ID
       WHERE EXTRACT(YEAR FROM p.PAYMENT_DATE) = :year
       ORDER BY p.PAYMENT_DATE DESC NULLS LAST`,
      { year }
    );

    res.json(result.rows.map(r => ({
      TOTAL_PRICE: r[0],
      PAY_STATUS: r[1],
      PAYMENT_DATE: r[2],
      PAY_ID: r[3],
      BOOKING_ID: r[4],
      CUST_NAME: r[5],
      HOMESTAY_NAME: r[6],
      EMP_NAME: r[7] || "-",
      RECEIPT_NO: r[8] || "-"
    })));

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) await connection.close();
  }
});


// 2) Monthly revenue for selected year (PAID only)  <-- chart
app.get('/api/revenue/monthly', async (req, res) => {
  const year = Number(req.query.year);
  let connection;

  if (!year || Number.isNaN(year)) {
    return res.status(400).json({ error: "Valid 'year' query param is required." });
  }

  try {
    connection = await getConnection();

    const result = await connection.execute(
      `SELECT
          EXTRACT(MONTH FROM p.PAYMENT_DATE) AS MONTH_NO,
          SUM(p.TOTAL_PRICE) AS MONTHLY_REVENUE
       FROM PAYMENT p
       JOIN BOOKING b ON p.BOOKING_ID = b.BOOKING_ID
       JOIN CUSTOMER c ON b.CUST_ID = c.CUST_ID
       JOIN HOMESTAY h ON b.HOMESTAY_ID = h.HOMESTAY_ID
       WHERE EXTRACT(YEAR FROM p.PAYMENT_DATE) = :year
         AND UPPER(p.PAY_STATUS) = 'PAID'
         AND p.PAYMENT_DATE IS NOT NULL
       GROUP BY EXTRACT(MONTH FROM p.PAYMENT_DATE)
       ORDER BY MONTH_NO`,
      { year }
    );

    const monthly = Array(12).fill(0);
    for (const row of result.rows) {
      const monthNo = Number(row[0]);        // 1..12
      const amt = Number(row[1] || 0);
      if (monthNo >= 1 && monthNo <= 12) monthly[monthNo - 1] = amt;
    }

    return res.json({ year, monthlyRevenue: monthly });

  } catch (err) {
    console.error("Monthly revenue error:", err);
    return res.status(500).json({ error: err.message });
  } finally {
    if (connection) await connection.close();
  }
});


// 3) Total revenue for selected year (PAID only)
app.get('/api/revenue/total', async (req, res) => {
  const year = Number(req.query.year);
  let connection;

  if (!year || Number.isNaN(year)) {
    return res.status(400).json({ error: "Valid 'year' query param is required." });
  }

  try {
    connection = await getConnection();

    const result = await connection.execute(
      `SELECT
          NVL(SUM(p.TOTAL_PRICE), 0) AS TOTAL_REVENUE
       FROM PAYMENT p
       JOIN BOOKING b ON p.BOOKING_ID = b.BOOKING_ID
       JOIN CUSTOMER c ON b.CUST_ID = c.CUST_ID
       JOIN HOMESTAY h ON b.HOMESTAY_ID = h.HOMESTAY_ID
       WHERE EXTRACT(YEAR FROM p.PAYMENT_DATE) = :year
         AND UPPER(p.PAY_STATUS) = 'PAID'
         AND p.PAYMENT_DATE IS NOT NULL`,
      { year }
    );

    const totalRevenue = Number(result.rows?.[0]?.[0] || 0);
    return res.json({ year, totalRevenue });

  } catch (err) {
    console.error("Total revenue error:", err);
    return res.status(500).json({ error: err.message });
  } finally {
    if (connection) await connection.close();
  }
});


// 4) Bookings for selected year (JOIN customer + homestay + payment)
app.get('/api/bookings', async (req, res) => {
  const year = Number(req.query.year);
  let connection;

  if (!year || Number.isNaN(year)) {
    return res.status(400).json({ error: "Valid 'year' query param is required." });
  }

  try {
    connection = await getConnection();

    const result = await connection.execute(
      `SELECT
          b.BOOKING_ID,
          b.BOOKING_DATE,
          b.CHECKIN,
          b.CHECKOUT,
          b.TOTAL_NIGHT,
          c.CUST_ID,
          c.CUST_FNAME || ' ' || NVL(c.CUST_LNAME,'') AS CUST_NAME,
          h.HOMESTAY_ID,
          h.HOMESTAY_NAME,
          NVL(p.PAY_STATUS, 'PENDING') AS PAY_STATUS
       FROM BOOKING b
       JOIN CUSTOMER c ON b.CUST_ID = c.CUST_ID
       JOIN HOMESTAY h ON b.HOMESTAY_ID = h.HOMESTAY_ID
       LEFT JOIN PAYMENT p ON p.BOOKING_ID = b.BOOKING_ID
       WHERE EXTRACT(YEAR FROM b.BOOKING_DATE) = :year
       ORDER BY b.CHECKIN DESC`,
      { year }
    );

    // Keep it as array so your report.js can still do bookings.length
    res.json(result.rows.map(r => ({
      bookingId: r[0],
      bookingDate: r[1],
      checkin: r[2],
      checkout: r[3],
      totalNight: r[4],
      custId: r[5],
      custName: r[6],
      homestayId: r[7],
      homestayName: r[8],
      payStatus: r[9]
    })));

  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) await connection.close();
  }
});


// 5) Customers "for selected year" (JOIN CUSTOMER + BOOKING)
app.get('/api/customersY', async (req, res) => {
  const year = Number(req.query.year);
  let connection;

  if (!year || Number.isNaN(year)) {
    return res.status(400).json({ error: "Valid 'year' query param is required." });
  }

  try {
    connection = await getConnection();

    const result = await connection.execute(
      `SELECT
          COUNT(DISTINCT c.CUST_ID) AS TOTAL_CUSTOMERS
       FROM CUSTOMER c
       JOIN BOOKING b ON b.CUST_ID = c.CUST_ID
       WHERE EXTRACT(YEAR FROM b.BOOKING_DATE) = :year`,
      { year }
    );

    const totalCustomers = Number(result.rows?.[0]?.[0] || 0);
    res.json({ year, totalCustomers });

  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) await connection.close();
  }
});


// 6) Housekeeping jobs for selected year, only COMPLETED (JOIN homestay + employee)
app.get('/api/housekeepingrp', async (req, res) => {
  const year = Number(req.query.year);
  let connection;

  if (!year || Number.isNaN(year)) {
    return res.status(400).json({ error: "Valid 'year' query param is required." });
  }

  try {
    connection = await getConnection();

    const result = await connection.execute(
      `SELECT
          hk.HOUSEKEEP_ID,
          hk.HK_DATE,
          hk.STATUS,
          hm.HOMESTAY_ID,
          hm.HOMESTAY_NAME,
          e.EMP_ID,
          e.EMP_FNAME || ' ' || NVL(e.EMP_LNAME,'') AS EMP_NAME
       FROM HOUSEKEEPING hk
       JOIN HOMESTAY hm ON hk.HOMESTAY_ID = hm.HOMESTAY_ID
       JOIN EMPLOYEE e ON hk.EMP_ID = e.EMP_ID
       WHERE EXTRACT(YEAR FROM hk.HK_DATE) = :year
         AND UPPER(hk.STATUS) = 'COMPLETED'
       ORDER BY hk.HK_DATE DESC NULLS LAST`,
      { year }
    );

    // Keep array so report.js can do housekeeping.length
    res.json(result.rows.map(r => ({
      id: r[0],
      hk_date: r[1],
      status: r[2],
      homestay_id: r[3],
      homestay_name: r[4],
      emp_id: r[5],
      emp_name: r[6]
    })));

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    if (connection) await connection.close();
  }
});


// ------------------------------------------------LISTEN------------------------------------------------------------//

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
