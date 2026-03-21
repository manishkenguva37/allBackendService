const myMiddleware = (req, res, next) => {
  console.log("🔥 Global Middleware Running");
  console.log(`${req.method} ${req.url}`);
  const encOrgName = req.headers["x-org-name"];
    const encOrgSecret = req.headers["x-org-secret"];

    if (!encOrgName || !encOrgSecret) {
      return res.status(400).json({
        success: false,
        message: "Missing org headers",
      });
    }


    let orgName, orgSecret;

    try {
      orgName = await decryptHeader(encOrgName);
      orgSecret = await decryptHeader(encOrgSecret);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: "Header decryption failed",
      });
    }

  next(); // VERY IMPORTANT
};


export default myMiddleware;



