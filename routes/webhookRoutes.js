const express = require("express");
const bodyParser = require("body-parser");
const { Webhook } = require("svix"); // Using CommonJS require
const dotenv = require("dotenv");
const User = require("../models/User"); // Assuming User model is in the models directory

dotenv.config();

const router = express.Router();

// Webhook for Clerk user events (created, updated, deleted)
router.post(
  "/clerk",
  // This is a generic method to parse the contents of the payload as JSON
  bodyParser.json(),
  async (req, res) => {
    const SIGNING_SECRET = process.env.SIGNING_SECRET;

    // Ensure the signing secret is loaded
    if (!SIGNING_SECRET) {
      console.log("Error: SIGNING_SECRET is missing");
      return void res.status(400).json({
        success: false,
        message:
          "Error: Please add SIGNING_SECRET from Clerk Dashboard to .env",
      });
    }

    // Create new Svix instance with the secret
    const wh = new Webhook(SIGNING_SECRET);

    // Get headers and body
    const headers = req.headers;
    const payload = req.body;

    // Log the payload for debugging
    console.log("Received Payload:", JSON.stringify(payload, null, 2));

    // Get Svix headers for verification
    const svix_id = headers["svix-id"];
    const svix_timestamp = headers["svix-timestamp"];
    const svix_signature = headers["svix-signature"];

    // If there are no headers, error out
    if (!svix_id || !svix_timestamp || !svix_signature) {
      return void res.status(400).json({
        success: false,
        message: "Error: Missing svix headers",
      });
    }

    // Ensure the payload is a string (since Svix expects raw body as a string)
    const payloadString = JSON.stringify(payload);

    let evt;

    // Attempt to verify the incoming webhook
    // If successful, the payload will be available from 'evt'
    // If verification fails, error out and return error code
    try {
      evt = wh.verify(payloadString, {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      });
    } catch (err) {
      console.log("Error: Could not verify webhook:", err.message);
      return void res.status(400).json({
        success: false,
        message: `Webhook verification failed: ${err.message}`,
      });
    }

    // Do something with the payload
    const { id, email, first_name, last_name, role } = evt.data;
    const eventType = evt.type;
    console.log(
      `Received webhook with ID ${id} and event type of ${eventType}`
    );
    console.log("Webhook payload:", JSON.stringify(evt.data, null, 2));

    const name = `${first_name} ${last_name}`; // Combine first and last name into the 'name' field

    try {
      if (eventType === "user.created") {
        // For user creation
        const userExists = await User.findOne({ clerkUserId: id });
        if (!userExists) {
          const newUser = new User({
            clerkUserId: id,
            email,
            name, // Full name combined from first and last name
            role: ["reader", "reporter"], // Default roles
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
          { email, name, role: ["reader", "reporter"] }, // Update name and role
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
      return void res.status(200).json({
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
  }
);

module.exports = router;
