const router = require("express").Router();
const admin = require("firebase-admin");
const db = admin.firestore();
const { Timestamp } = require("firebase-admin/firestore");

const env = "dev";

//SNACKMEN ORDER FOOD
router.post("/order/:userId", async (req, res) => {
  try {
    const { name, fcm_token, ...rest } = req.body;
    const userOrder = {
      fcm_token : fcm_token ? fcm_token : null,
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
    res.status(200).json("delivered set to true");
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
});

//SNACKMEN ADD NEW ITEM
router.post("/item/add/", async (req, res) => {
  try {
    await db.collection(`bento/${env}/food`).add({ ...req.body });
    res.status(200).json("new item added");
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
});

//SNACKMEN DELETE ITEM
router.delete("/item/delete/:itemId", async (req, res) => {
  try {
    await db.collection(`bento/${env}/food`).doc(req.params.itemId).delete();
    res.status(200).json("item deleted");
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
});

//SNACKMEN UPDATE ITEM
router.put("/item/update/:itemId", async (req, res) => {
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
    res.status(200).json("item deleted");
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
});

module.exports = router;
