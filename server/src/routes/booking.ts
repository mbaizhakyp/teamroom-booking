import { Router } from "express"
import prisma from "../db.js"
import { authMiddleware } from "../middleware/auth.js"                                                                 

const router = Router()

router.get("/", async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany()
    res.json(bookings)
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch bookings" })
  }
})

router.post("/", authMiddleware, async (req, res) => {
  try {
    const { userId, roomId, startTime, endTime, status } = req.body
    const booking = await prisma.booking.create({ data: { userId, roomId, startTime, endTime, status } })
    res.json(booking)
  } catch (error) {
    res.status(500).json({ error: "Failed to create booking" })
  }
})

export default router