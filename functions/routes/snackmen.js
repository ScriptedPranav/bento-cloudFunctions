const router = require("express").Router();
const admin = require("firebase-admin");
const db = admin.firestore();
const { Timestamp } = require("firebase-admin/firestore");

const env = "dev";

//SNACKMEN ORDER FOOD
router.post("/order/:userId", async (req, res) => {
  try {
    const items = req.body.cart;
    const promises = [];
    items.forEach((item) => {
      promises.push(db.collection(`bento/${env}/food`).doc(item.id).get());
    });

    const snapshots = await Promise.all(promises);
    let updates = [];
    snapshots.forEach((snapshot, index) => {
      const item = snapshot.data();
      if (item.qty < items[index].qty) {
        return;
      }
      updates.push({ snapshotId: snapshot.id, decrement: items[index].qty });
    });
    if (snapshots.length !== updates.length) {
      console.log("Not enough items available");
      res.status(400).json("Not enough items available");
      return;
    }
    updates.forEach((update) =>
      db
        .collection(`bento/${env}/food`)
        .doc(update.snapshotId)
        .update({
          qty: admin.firestore.FieldValue.increment(-update.decrement),
        })
    );

    const { name, fcm_token, ...rest } = req.body;
    const userOrder = {
      fcm_token: fcm_token ? fcm_token : null,
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
    const ref = await db
      .collection(`bento/${env}/users/${req.params.userId}/orders`)
      .add(userOrder);
    await db
      .collection(`bento/${env}/todayOrders`)
      .doc(ref.id)
      .set({
        userId: req.params.userId,
        ...todayOrder,
      });
    res.status(200).json("Order created successfully");
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
});

//SNACKMEN CANCEL USER ORDER
router.delete("/order/delete", async (req, res) => {
  try {
    const { userId, orderId } = req.query;
    const delete1 = db
      .doc(`bento/${env}/users/${userId}/orders/${orderId}`)
      .delete();
    const delete2 = db
      .collection(`bento/${env}/todayOrders`)
      .doc(orderId)
      .delete();
    await Promise.all([delete1, delete2]);
    res.status(200).json("order deleted")
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
