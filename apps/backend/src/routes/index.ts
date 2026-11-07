import { Router } from "express";
import authRoutes from "./authRoutes";
import configRoutes from "./configRoutes";
import repairTypeRoutes from "./repairTypeRoutes";
import priceListRoutes from "./priceListRoutes";
import customerRoutes from "./customerRoutes";
import ticketRoutes from "./ticketRoutes";
import trackRoutes from "./trackRoutes";
import contactRoutes from "./contactRoutes";
import wholesaleRoutes from "./wholesaleRoutes";
import analyticsRoutes from "./analyticsRoutes";
import stockRoutes from "./stockRoutes";

const router = Router();

router.use("/admin", authRoutes);
// Mounted after authRoutes: Express strips the "/admin" prefix and tries
// authRoutes first for any /admin/* request, but authRoutes only defines
// /login and /change-password, so it calls next() and falls through here
// for anything under /admin/wholesale, /admin/analytics, or /admin/stock.
router.use("/admin/wholesale", wholesaleRoutes);
router.use("/admin/analytics", analyticsRoutes);
router.use("/admin/stock", stockRoutes);
router.use("/config", configRoutes);
router.use("/repair-types", repairTypeRoutes);
router.use("/price-list", priceListRoutes);
router.use("/customers", customerRoutes);
router.use("/tickets", ticketRoutes);
router.use("/track", trackRoutes);
router.use("/contact", contactRoutes);

export default router;
