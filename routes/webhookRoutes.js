const express = require("express");
const bodyParser = require("body-parser");
const { Webhook } = require("svix");
const dotenv = require("dotenv");
const User = require("../models/User");

dotenv.config();

const router = express.Router();

router.post("/clerk", bodyParser.json(), async (req, res) => {
  const SIGNING_SECRET = process.env.SIGNING_SECRET;

  // Ensure the signing secret is loaded
  if (!SIGNING_SECRET) {
    return res.status(400).json({
      success: false,
      message: "Error: Please add SIGNING_SECRET from Clerk Dashboard to .env",
    });
  }

  const wh = new Webhook(SIGNING_SECRET);
  const headers = req.headers;
  const payload = req.body;

  console.log("Received Payload:", JSON.stringify(payload, null, 2));

  const svix_id = headers["svix-id"];
  const svix_timestamp = headers["svix-timestamp"];
  const svix_signature = headers["svix-signature"];

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return res.status(400).json({
      success: false,
      message: "Error: Missing svix headers",
    });
  }

  const payloadString = JSON.stringify(payload);
  let evt;

  try {
    evt = wh.verify(payloadString, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: `Webhook verification failed: ${err.message}`,
    });
  }

  // Extract relevant data from the payload
  const { id, first_name, last_name, role, email_addresses } = evt.data;
  const eventType = evt.type;
  
  // Extract email from email_addresses array
  const email = email_addresses[0]?.email_address;

  // If email is not found, return an error
  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Error: Email not found in the payload",
    });
  }

  const name = `${first_name} ${last_name}`;

  try {
    if (eventType === "user.created") {
      // For user creation
      const userExists = await User.findOne({ clerkUserId: id });
      if (!userExists) {
        const newUser = new User({
          clerkUserId: id,
          email,
          name,
          role: role || ["reader", "reporter"], // Default roles if none provided
        });
        await newUser.save();
        console.log(`User created with ID: ${id}`);
      } else {
        console.log(`User with ID ${id} already exists`);
      }
    }

    if (eventType === "user.updated") {
      // For user update
      const updatedUser = await User.findOneAndUpdate(
        { clerkUserId: id },
        { email, name, role: role || ["reader", "reporter"] },
        { new: true }
      );
      console.log(`User updated with ID: ${id}`);
    }

    if (eventType === "user.deleted") {
      // For user deletion
      const deletedUser = await User.findOneAndDelete({ clerkUserId: id });
      console.log(`User deleted with ID: ${id}`);
    }

    // Return a successful response
    return res.status(200).json({
      success: true,
      message: "Webhook received and processed successfully",
    });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return res.status(500).json({
      success: false,
      message: "Error processing webhook",
    });
  }
});

module.exports = router;
