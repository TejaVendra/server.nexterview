import express from "express";

import {
  getBetterContext,
  getResumeMakerDetails,
  saveResumeMaker,
} from "../controllers/resumeMakerController.js";

import { protectedRoute } from "../middleware/protected.js";

const router = express.Router();


/*
|--------------------------------------------------------------------------
| GET current user's resume
|--------------------------------------------------------------------------
*/

router.get(
  "/",
  protectedRoute,
  getResumeMakerDetails
);


/*
|--------------------------------------------------------------------------
| PUT complete resume
|--------------------------------------------------------------------------
*/

router.put(
  "/",
  protectedRoute,
  saveResumeMaker
);

router.post("/context",protectedRoute,getBetterContext);


export default router;