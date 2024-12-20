const { clerkClient } = require("@clerk/express");
const User = require("../models/User.js"); // Assuming you already have the user schema defined
const { default: mongoose } = require("mongoose");
const axios = require('axios'); 

// Register User
const registerUser = async (req, res) => {
  try {
    const { email, firstName, lastName, clerkUserId, role } = req.body;

    // Validate required fields
    if (!email || !firstName || !lastName || !clerkUserId) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Combine first name and last name
    const name = `${firstName} ${lastName}`;

    // Validate roles (optional if schema enum already restricts invalid values)
    if (role && !["reader", "reporter", "admin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role selected" });
    }

    // Check if the user already exists
    const existingUser = await User.findOne({ clerkUserId });
    if (existingUser) {
      return res.status(400).json({ message: "User already registered" });
    }

    // Create new user
    const newUser = new User({
      clerkUserId,
      email,
      name, // Save combined name
      role, // If not provided, schema default will apply
    });

    // Save the new user to the database
    await newUser.save();

    res
      .status(201)
      .json({ message: "User registered successfully", user: newUser });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


// Login User
const loginUser = async (req, res) => {
  try {
    const { clerkUserId } = req.body;

    // Use Clerk to fetch user details
    const user = await clerkClient.users.getUser(clerkUserId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return the user information along with their role and status
    res.status(200).json({
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email, // First email in the array
        name: user.name,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    console.error("Error logging in user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get User Profile
// const getUserProfile = async (req, res) => {
//   try {
//     // const userId = req.auth.userId; // Get Clerk UserId from the authenticated request
//     const userId = req.auth.userId; // Get Clerk UserId from the authenticated request
//     const user = await clerkClient.users.getUser(userId); // Fetch user from Clerk

//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     // Get additional user data from your database if needed (e.g., role, region, etc.)
//     const dbUser = await User.findOne({ clerkUserId: user.id }); // Fetch user from your DB
//     return res.status(200).json({ user: dbUser });
//   } catch (error) {
//     return res
//       .status(500)
//       .json({ message: "Server error", error: error.message });
//   }
// };

const getUserProfile = async (req, res) => {
  try {
    // Extract userId (reporterId or clerkUserId) from request parameters
    const { userId } = req.params;

    if (!userId) {
      return res
        .status(400)
        .json({ message: "User ID (reporterId or clerkUserId) is required" });
    }

    let dbUser;

    // Determine if userId is a valid ObjectId
    if (mongoose.Types.ObjectId.isValid(userId)) {
      // Query using _id or clerkUserId if userId could be an ObjectId
      dbUser = await User.findOne({
        $or: [{ _id: userId }, { clerkUserId: userId }],
      });
    } else {
      // Query only using clerkUserId if userId is not a valid ObjectId
      dbUser = await User.findOne({ clerkUserId: userId });
    }

    if (!dbUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return the user profile data
    return res.status(200).json({ user: dbUser });
  } catch (error) {
    console.error("Error fetching user profile:", error.message);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};



const getUserProfileByClerk = async (req, res) => {
  try {
    const { clerkUserId } = req.params;

    if (!clerkUserId) {
      return res.status(400).json({ message: "Clerk User ID is required" });
    }

    // Query by `clerkUserId` instead of `_id`
    const dbUser = await User.findOne({ clerkUserId }); // Assuming `clerkUserId` is a field in your User schema

    if (!dbUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return the user profile data
    return res.status(200).json({ user: dbUser });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};


// Promote a user to reporter/editor
const promoteUser = async (req, res) => {
  try {
    const { userId, role } = req.body; // Expect userId and new role in the request body
    const allowedRoles = ["reporter", "editor", "admin"];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role provided" });
    }

    // Check if the user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update user role
    user.role = role;
    await user.save();

    return res
      .status(200)
      .json({ message: "User promoted successfully", user });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

// Approve or Reject User
const approveRejectUser = async (req, res) => {
  try {
    const { userId, action } = req.body; // Expect userId and action ("approve" or "reject") in the request body

    if (!["approve", "reject"].includes(action)) {
      return res
        .status(400)
        .json({ message: "Invalid action. Use 'approve' or 'reject'" });
    }

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // If the action is approve, set status to 'approved'
    user.status = action === "approve" ? "approved" : "reject";
    await user.save();

    return res
      .status(200)
      .json({ message: `User ${action}d successfully`, user });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

// User Subscription Management
const subscribeToRegion = async (req, res) => {
  try {
    const { clerkUserId, regionId, regionType } = req.body; // Expect clerkUserId, regionId, and regionType in the request body

    // Validate region type
    const allowedRegionTypes = ["State", "District", "City", "Locality"];
    if (!allowedRegionTypes.includes(regionType)) {
      return res.status(400).json({ message: "Invalid region type" });
    }

    // Find user by clerkUserId
    const user = await User.findOne({ clerkUserId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if the user is already subscribed
    const alreadySubscribed = user.subscriptions.some(
      (sub) =>
        sub.regionId.toString() === regionId && sub.regionType === regionType
    );

    if (alreadySubscribed) {
      return res
        .status(400)
        .json({ message: "User is already subscribed to this region" });
    }

    // Add subscription
    user.subscriptions.push({ regionId, regionType });
    await user.save();

    return res
      .status(200)
      .json({ message: "User subscribed to region successfully", user });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};


// const subscribeToRegion = async (req, res) => {
//   try {
//     const { userId, regionId, regionType } = req.body; // Expect userId, regionId, and regionType in the request body

//     // Validate region type
//     const allowedRegionTypes = ["State", "District", "City", "Locality"];
//     if (!allowedRegionTypes.includes(regionType)) {
//       return res.status(400).json({ message: "Invalid region type" });
//     }

//     // Find user
//     const user = await User.findById(userId);
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     // Check if the user is already subscribed
//     const alreadySubscribed = user.subscriptions.some(
//       (sub) =>
//         sub.regionId.toString() === regionId && sub.regionType === regionType
//     );

//     if (alreadySubscribed) {
//       return res
//         .status(400)
//         .json({ message: "User is already subscribed to this region" });
//     }

//     // Fetch the region name from the external microservice
//     let regionName;
//     try {
//       const regionResponse = await axios.get(`http://localhost:5003/api/v1/region/locality/${regionId}`);
//       regionName = regionResponse.data.name;  // Assuming the region name is in `name` field
//     } catch (error) {
//       return res.status(500).json({ message: "Error fetching region name", error: error.message });
//     }

//     // Add subscription with the fetched region name
//     user.subscriptions.push({ regionId, regionType, regionName });
//     await user.save();

//     return res
//       .status(200)
//       .json({ message: "User subscribed to region successfully", user });
//   } catch (error) {
//     return res
//       .status(500)
//       .json({ message: "Server error", error: error.message });
//   }
// };


// Update User Details
const updateUser = async (req, res) => {
  try {
    const { id } = req.params; // Extract user ID from params
    const { role, status, assignedRegionId, assignedRegionLevel, name } =
      req.body; // Fields to update

    // Validate fields to update
    const validUpdates = {};
    if (name) validUpdates.name = name;
    if (role) validUpdates.role = role;
    if (status) validUpdates.status = status;
    if (assignedRegionId) validUpdates.assignedRegionId = assignedRegionId;
    if (assignedRegionLevel)
      validUpdates.assignedRegionLevel = assignedRegionLevel;

    // Only admin can perform this action
    // if (req.auth.role !== "admin") {
    //   return res.status(403).json({ message: "Access denied. Admins only." });
    // }

    // Find the user and update
    const user = await User.findByIdAndUpdate(id, validUpdates, {
      new: true, // Return the updated document
    });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.status(200).json({
      message: "User details updated successfully.",
      user,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

// Unsubscribe from a Region
const unsubscribeRegion = async (req, res) => {
  try {
    const { clerkUserId } = req.params; // Extract clerkUserId from params
    const { regionId, regionType } = req.body; // Region details from the request body

    // Ensure both regionId and regionType are provided
    if (!regionId || !regionType) {
      return res
        .status(400)
        .json({ message: "Region ID and type are required." });
    }

    // Find the user by clerkUserId
    const user = await User.findOne({ clerkUserId }); // Use findOne instead of findById for clerkUserId

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Remove the region from the user's subscriptions
    const updatedSubscriptions = user.subscriptions.filter(
      (subscription) =>
        !(
          subscription.regionId.toString() === regionId &&
          subscription.regionType === regionType
        )
    );

    if (updatedSubscriptions.length === user.subscriptions.length) {
      return res
        .status(400)
        .json({ message: "Region not found in subscriptions." });
    }

    // Update the user's subscriptions
    user.subscriptions = updatedSubscriptions;
    await user.save();

    res.status(200).json({
      message: "Unsubscribed from region successfully.",
      subscriptions: user.subscriptions,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};


// Assign Region to Reporter/Editor
const assignRegion = async (req, res) => {
  try {
    const { id } = req.params; // Extract user ID from params
    const { regionId, regionType } = req.body; // Region details from the request body

    // Validate request body
    if (!regionId || !regionType) {
      return res
        .status(400)
        .json({ message: "Region ID and type are required." });
    }

    // Ensure user has the appropriate role (e.g., 'editor' or 'reporter')
    const user = await User.findById(id);
    if (!user || !["editor", "reporter"].includes(user.role)) {
      return res.status(403).json({
        message: "Only reporters or editors can be assigned regions.",
      });
    }

    // Assign the region to the user
    user.assignedRegionId = regionId;
    user.assignedRegionLevel = regionType;
    await user.save();

    res.status(200).json({
      message: `Region assigned to ${user.role} successfully.`,
      user,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

// Get user status (General)
const getUserStatus = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.status(200).json({ status: user.status });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch user status.", error });
  }
};

// Get Users by Role Controller
const getUsersByRole = async (req, res) => {
  try {
    const { role } = req.params;

    // Validate the role
    const validRoles = ["reader", "reporter", "editor", "admin"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role." });
    }

    // Fetch users by role
    const users = await User.find({ role });

    res.status(200).json({ users });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch users by role.", error });
  }
};

// Function to check subscription status and fetch regionId and regionType
const checkSubscriptionStatus = async (clerkUserId, regionId, regionType) => {
  try {
    // Check if regionId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(regionId)) {
      throw new Error("Invalid regionId format");
    }

    // Fetch the user by clerkUserId (instead of userId)
    const user = await User.findOne({ clerkUserId });

    if (!user) {
      throw new Error("User not found");
    }

    // Check if the user is subscribed to the specific region
    const subscription = user.subscriptions.find(
      (subscription) =>
        String(subscription.regionId) === String(regionId) &&
        subscription.regionType === regionType
    );

    if (subscription) {
      // Return subscription status with region details
      return {
        subscribed: true,
        message: "User is subscribed to this region.",
        regionId: subscription.regionId,
        regionType: subscription.regionType,
      };
    } else {
      return {
        subscribed: false,
        message: "User is not subscribed to this region.",
      };
    }
  } catch (error) {
    console.error(error);
    throw new Error("Error checking subscription status");
  }
};


// Fetch all subscribed regions for a user
// const checkSubscriptionStatus = async (clerkUserId) => {
//   try {
//     // Fetch the user by clerkUserId
//     const user = await User.findOne({ clerkUserId });

//     if (!user) {
//       throw new Error("User not found");
//     }

//     // Check if the user has any subscriptions
//     if (user.subscriptions.length === 0) {
//       return { message: "No subscriptions found" };  // Return message when no subscriptions exist
//     }

//     // Return the list of subscriptions if found
//     return user.subscriptions;
//   } catch (error) {
//     console.error(error);
//     throw new Error("Error fetching subscriptions");
//   }
// };



// Get Subscribed Region
const getSubscribedRegions = async (userId) => {
  try {
    const user = await User.findById(userId);

    if (!user) {
      throw new Error("User not found");
    }

    // Return an array of subscriptions
    return user.subscriptions.map((subscription) => ({
      regionId: subscription.regionId,
      regionType: subscription.regionType,
      subscribedAt: subscription.subscribedAt,
    }));
  } catch (error) {
    console.error(error);
    throw new Error("Error fetching subscribed regions");
  }
};

module.exports = {
  getSubscribedRegions,
  checkSubscriptionStatus,
  getUsersByRole,
  registerUser,
  getUserStatus,
  loginUser,
  assignRegion,
  unsubscribeRegion,
  updateUser,
  subscribeToRegion,
  approveRejectUser,
  promoteUser,
  getUserProfile,
  getUserProfileByClerk
};
