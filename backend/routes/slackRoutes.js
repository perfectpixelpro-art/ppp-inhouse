import { Router } from "express";
import express from "express";
import { interactions } from "../controllers/slackController.js";

const router = Router();

// Slack posts application/x-www-form-urlencoded; we must verify the signature
// against the RAW body, so capture it here before parsing.
const rawUrlencoded = express.urlencoded({
  extended: false,
  verify: (req, res, buf) => {
    req.rawBody = buf.toString("utf8");
  },
});

router.post("/interactions", rawUrlencoded, interactions);
// Alias: the Slack app's Interactivity Request URL is configured to POST the
// bare root, so accept that too (mounted at "/" in server.js → POST /).
router.post("/", rawUrlencoded, interactions);

export default router;
