const router = require("express").Router();
const admin = require("firebase-admin");
const db = admin.firestore();
const { Timestamp } = require("firebase-admin/firestore");

const env = "dev";

//CREATE USER
router.post("/signup/:userId", async (req, res) => {
  try {
    await db
      .collection(`bento/${env}/users`)
      .doc(req.params.userId)
      .set({
        ...req.body,
        timestamp: Timestamp.now(),
      });
    res.status(200).json("User created successfully");
  } catch (err) {
    res.status(500).json(err);
  }
});

//UPDATE USER
router.put("/update/:userId", async (req, res) => {
  try {
    await db
      .collection(`bento/${env}/users`)
      .doc(req.params.userId)
      .set(
        {
          ...req.body,
        },
        { merge: true }
      );
    res.status(200).json("User Updated");
  } catch (err) {
    res.status(500).json(err);
  }
});

module.exports = router;
