import { Router } from "express"
import prisma from "../db.js"

const router = Router()

router.get("/", async (req, res) => {
  try {
    const rooms = await prisma.room.findMany()
    res.json(rooms)
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch rooms" })
  }
})

router.post("/", async (req, res) => {
  try {
    const { name, capacity } = req.body
    const room = await prisma.room.create({ data: { name, capacity } })
    res.json(room)
  } catch (error) {
    res.status(500).json({ error: "Failed to create room" })
  }
})

export default router