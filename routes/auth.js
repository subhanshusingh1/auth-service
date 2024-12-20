// Import Modules
const express = require("express");
const {
  registerUser,
  loginUser,
  getUserProfile,
  promoteUser,
  approveRejectUser,
  subscribeToRegion,
  updateUser,
  unsubscribeRegion,
  assignRegion,
  getUserStatus,
  getUsersByRole,
  checkSubscriptionStatus,
  getSubscribedRegions,
  getUserProfileByClerk,
} = require("../controllers/authController.js");
const { requireAuth } = require("@clerk/express");
// const { isAdmin, isEditor } = require("../middlewares/roleMiddeware.js");

const router = express.Router();

// Public routes
router.post("/register", registerUser);
router.post("/login", loginUser);

// Get User Profile (Only authenticated users can access this route)
// router.get("/profile", requireAuth(), getUserProfile);
router.get("/profile/:userId", getUserProfile);

router.get("/details/:clerkUserId", getUserProfileByClerk);

// check subscription status
router.get("/:clerkUserId/subscription-status", async (req, res) => {
  try {
    const { clerkUserId } = req.params;
    const { regionId, regionType } = req.query; // assuming you pass regionId and regionType in the body
    const result = await checkSubscriptionStatus(
      clerkUserId,
      regionId,
      regionType
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Promote User (Admin only)
router.post(
  "/promote",
  requireAuth(),
  async (req, res, next) => {
    // Check if the user is an admin before allowing promotion
    if (req.auth.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Access forbidden. Admins only." });
    }
    next();
  },
  promoteUser
);

// Approve/Reject User (Admin only)
router.post(
  "/approve-reject",
  requireAuth(),
  async (req, res, next) => {
    if (req.auth.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Access forbidden. Admins only." });
    }
    next();
  },
  approveRejectUser
);

// User Subscription Management
// router.post("/subscribe", requireAuth(), subscribeToRegion);
router.post("/subscribe", subscribeToRegion);

// PATCH route to update user details (protected)
// router.patch("/:id", requireAuth(), updateUser);
router.patch("/:id", updateUser);

// PATCH route to unsubscribe from a region (protected)
// router.patch("/:id/unsubscribe", requireAuth(), unsubscribeRegion);
router.patch("/:clerkUserId/unsubscribe", unsubscribeRegion);

// PATCH route to assign a region (protected route, admin only)
// router.patch("/:id/assign-region", requireAuth(), async (req, res, next) => {
//   if (req.auth.role !== "admin") {
//     return res.status(403).json({ message: "Access forbidden. Admins only." });
//   }
//   next();
// }, assignRegion);
router.patch("/:id/assign-region", assignRegion);

// GET route to fetch user status
router.get("/:id/status", requireAuth(), getUserStatus);

// GET route to fetch users by role
// router.get("/role/:role", requireAuth(), getUsersByRole);
router.get("/role/:role", getUsersByRole);

// Route to fetch all subscribed regions for a user
router.get("/:userId/subscriptions", async (req, res) => {
  try {
    const subscriptions = await getSubscribedRegions(req.params.userId);
    res.status(200).json(subscriptions); // Return list of subscriptions
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
