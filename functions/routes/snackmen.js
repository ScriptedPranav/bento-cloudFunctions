const router = require("express").Router();
const admin = require("firebase-admin");
const db = admin.firestore();
const { Timestamp } = require("firebase-admin/firestore");

const env = "dev";

//SNACKMEN ORDER FOOD
router.post("/order/:userId", async (req, res) => {
  try {
    const { name, fcmToken, ...rest } = req.body;
    const userOrder = {
      fcmToken,
      ...rest,
      is_delivered: false,
      timestamp: Timestamp.now(),
    };

    const todayOrder = {
      name,
      ...rest,
      is_delivered: false,
      timestamp: Timestamp.now(),
    };
    const docRef = await db
      .collection(`bento/${env}/users/${req.params.userId}/orders`)
      .add(userOrder);
    await db
      .collection(`bento/${env}/todayOrders`)
      .doc(docRef.id)
      .set({
        userId: req.params.userId,
        ...todayOrder,
      });
    res.status(200).json("Order created");
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
});

//UPDATE SNACKMEN SERVICE STATUS
router.get("/status/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    const { isOpen } = req.query;
    await db
      .collection(`bento/${env}/status`)
      .doc(uid)
      .set(
        {
          status: `${isOpen ? "OPEN" : "CLOSED"}`,
        },
        { merge: true }
      );
    res.status(200).json("Status updated");
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
});

//SNACKMEN SET DELIVERED ORDER
router.get("/delivery", async (req, res) => {
  try {
    const { userId, orderId } = req.query;
    const deletion = db
      .collection(`bento/${env}/todayOrders`)
      .doc(orderId)
      .delete();
    const setter = db
      .collection(`bento/${env}/users/${userId}/orders`)
      .doc(orderId)
      .set(
        {
          is_delivered: true,
        },
        { merge: true }
      );
    await Promise.all([deletion, setter]);
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
});

//SNACKMEN ADD NEW ITEM
router.post("/api/snackmen/item/add/", async (req, res) => {
  try {
    await db.collection(`bento/${env}/food`).add({ ...req.body });
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
});

//SNACKMEN DELETE ITEM
router.delete("/api/snackmen/item/delete/:itemId", async (req, res) => {
  try {
    await db.collection(`bento/${env}/food`).doc(req.params.itemId).delete();
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
});

//SNACKMEN UPDATE ITEM
router.put("/api/snackmen/item/update/:itemId", async (req, res) => {
  try {
    await db
      .collection(`bento/${env}/food`)
      .doc(req.params.itemId)
      .set(
        {
          ...req.body,
        },
        { merge: true }
      );
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
});

module.exports = router;
