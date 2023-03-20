const router = require("express").Router();
const admin = require("firebase-admin");
const db = admin.firestore();
const batch = db.batch();
const { Timestamp } = require("firebase-admin/firestore");

const env = "dev";

//BOOK BARBER
router.post("/book/:userId", async (req, res) => {
  const appointment = await db
    .collection(`bento/${env}/barber`)
    .doc(req.params.userId)
    .get();
  if (!appointment.data()) {
    try {
      const userData = await db
        .collection(`bento/${env}/users`)
        .doc(req.params.userId)
        .get();
      const user = userData.data();
      const { name, hostel } = user;

      const barberData = {
        name,
        hostel,
        fcm_token: req.body.fcm_token,
        timestamp: Timestamp.now(),
      };

      const globalCounter = await db
        .collection(`bento/${env}/globalVariable`)
        .doc("barber")
        .get();
      const { queue_length } = globalCounter.data();

      const set1 = db
        .collection(`bento/${env}/barber`)
        .doc(req.params.userId)
        .set({
          ...barberData,
          queue_no: queue_length + 1,
          token_no: queue_length + 1001,
        });
      const set2 = db
        .collection(`bento/${env}/globalVariable`)
        .doc("barber")
        .update({ queue_length: admin.firestore.FieldValue.increment(1) });

      await Promise.all([set1, set2]);
      res.status(200).json("booking created");
    } catch (err) {
      console.log(err);
      res.status(500).json(err);
    }
  } else {
    res.status(203).json("booking exists");
  }
});

//DELETE BARBER BOOKING
router.delete("/delete/:bookingId", async (req, res) => {
  try {
    await db
      .collection(`bento/${env}/barber`)
      .doc(req.params.bookingId)
      .delete();
    res.status(200).json("booking deleted");
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
});

module.exports = router;
