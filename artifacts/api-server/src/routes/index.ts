import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import demoRouter from "./demo";
import businessesRouter from "./businesses";
import productsRouter from "./products";
import ordersRouter from "./orders";
import driversRouter from "./drivers";
import adminRouter from "./admin";
import statsRouter from "./stats";
import pointsRouter from "./points";
import addressesRouter from "./addresses";
import storageRouter from "./storage";
import promoCodesRouter from "./promo_codes";
import pushRouter from "./push";
import agentsRouter from "./agents";
import staffRouter from "./staff";
import favoritesRouter from "./favorites";
import { authLimiter, orderLimiter, supportLimiter } from "../lib/rate-limiters";

const router: IRouter = Router();

router.use(healthRouter);

// Auth rate limiting on login and register
router.post("/auth/login", authLimiter);
router.post("/auth/register", authLimiter);
router.use(authRouter);

router.use(demoRouter);
router.use(businessesRouter);
router.use(productsRouter);

// Order creation rate limiting
router.post("/orders", orderLimiter);
router.use(ordersRouter);

router.use(driversRouter);
router.use(adminRouter);
router.use(statsRouter);
router.use(pointsRouter);
router.use(addressesRouter);
router.use(storageRouter);
router.use(promoCodesRouter);
router.use(pushRouter);

// Support chat rate limiting
router.post("/agents/support/ask", supportLimiter);
router.use(agentsRouter);
router.use(staffRouter);
router.use(favoritesRouter);

export default router;
