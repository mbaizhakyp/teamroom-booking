import { Router } from "express"
import prisma from "../db.js"
import bcrypt from "bcryptjs"
import { hash } from "node:crypto"

const router = Router()

router.get("/", async (req, res) => {
  try {
    const users = await prisma.user.findMany()
    res.json(users)
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" })
  }
})

router.post("/", async (req, res) => {
  try {
    const { name, email, password } = req.body
    const hashedPassword = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({ data: { name, email, password: hashedPassword } })
    res.json(user)
  } catch (error) {
    res.status(500).json({ error: "Failed to create user" })
  }
})

export default router