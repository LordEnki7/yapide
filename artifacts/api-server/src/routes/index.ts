import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import businessesRouter from "./businesses";
import productsRouter from "./products";
import ordersRouter from "./orders";
import driversRouter from "./drivers";
import adminRouter from "./admin";
import statsRouter from "./stats";
import pointsRouter from "./points";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(businessesRouter);
router.use(productsRouter);
router.use(ordersRouter);
router.use(driversRouter);
router.use(adminRouter);
router.use(statsRouter);
router.use(pointsRouter);

export default router;
