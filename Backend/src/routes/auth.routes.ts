import { Router } from "express";
import { login, logout, me, register } from "../controllers/auth.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const authRouter = Router();

authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.post("/logout", requireAuth, logout);
authRouter.get("/me", requireAuth, me);

export default authRouter;