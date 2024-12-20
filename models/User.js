const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    clerkUserId: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    role: {
      type: [String], // Defines 'role' as an array of strings
      enum: ["reader", "reporter", "admin"], // Restricts values to these options
      default: ["reader", "reporter"], // Default values
    },
    // status: {
    //   type: String,
    //   enum: ["pending", "approved", "reject"],
    //   default: function () {
    //     return this.role === "reporter" ? "pending" : "approved";
    //   },
    // },

    status: {
      type: String,
      enum: ["pending", "approved", "reject"], // Valid values
      default: "approved", // Always defaults to "approved"
    },

    // resumeUrl: {
    //   type: String,
    //   default: null,
    // },
    // workDescription: {
    //   type: String,
    //   default: null,
    // },
    // publishedWorkUrls: [
    //   {
    //     type: String,
    //     default: [],
    //   },
    // ],
    assignedRegionId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "assignedRegionLevel",
      default: null,
    },
    assignedRegionLevel: {
      type: String,
      enum: ["state", "district", "city", "locality"],
      default: "locality",
    },
    subscriptions: [
      {
        regionId: {
          type: mongoose.Schema.Types.ObjectId,
          refPath: "regionType",
          required: true,
        },
        regionType: {
          type: String,
          enum: ["State", "District", "City", "Locality"],
          required: true,
        },
        subscribedAt: {
          type: Date,
          default: Date.now,
        },
        expiresAt: {
          type: Date,
          default: null,
        },
      },
    ],
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Add indexes
userSchema.index({ role: 1, status: 1 });

module.exports = mongoose.model("User", userSchema);
