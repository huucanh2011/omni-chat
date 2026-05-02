import { Router } from "express";
import { z } from "zod";
import { AccountService } from "../core/accountService.js";

const router = Router();
const service = new AccountService();

const createAccountSchema = z.object({
  platform: z.enum(["telegram", "zalo", "teams"]),
  displayName: z.string().min(1),
  serviceUrl: z.string().url().optional()
});

const updateAccountSchema = z
  .object({
    displayName: z.string().min(1).optional(),
    serviceUrl: z.string().url().optional(),
    status: z.enum(["connected", "disconnected", "expired"]).optional()
  })
  .refine((v) => Object.keys(v).length > 0, { message: "At least one field must be provided" });

router.get("/accounts", (_req, res) => {
  res.json(service.listAccounts());
});

router.get("/accounts/:id", (req, res) => {
  const account = service.getAccount(req.params.id);
  if (!account) return res.status(404).json({ error: "Account not found" });
  res.json(account);
});

router.post("/accounts", (req, res) => {
  const parsed = createAccountSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const account = service.addAccount(parsed.data.platform, parsed.data.displayName, parsed.data.serviceUrl);
  res.status(201).json(account);
});

router.patch("/accounts/:id", (req, res) => {
  const parsed = updateAccountSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const account = service.updateAccount(req.params.id, parsed.data);
  if (!account) return res.status(404).json({ error: "Account not found" });
  res.json(account);
});

router.delete("/accounts/:id", (req, res) => {
  const removed = service.removeAccount(req.params.id);
  if (!removed) return res.status(404).json({ error: "Account not found" });
  res.status(204).send();
});

export default router;
