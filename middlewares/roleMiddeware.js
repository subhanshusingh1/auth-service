const isAdmin = (req, res, next) => {
    const user = req.user; // Assuming `req.user` is populated by Clerk
    
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: Admins only" });
    }
  
    next(); // Proceed if the user is an admin
  };
  
  const isEditor = (req, res, next) => {
    const user = req.user; // Assuming `req.user` is populated by Clerk
    
    if (!user || (user.role !== "admin" && user.role !== "editor")) {
      return res.status(403).json({ message: "Forbidden: Editors only" });
    }
  
    next(); // Proceed if the user is an admin or editor
  };
  
  export { isAdmin, isEditor };
  