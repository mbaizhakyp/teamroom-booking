import { Router } from "express"
import prisma from "../db.js"
import jwt from "jsonwebtoken"                         
import bcrypt from "bcryptjs"                                                                                          

const router = Router()

router.post("/", async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await prisma.user.findUnique({ where: {email} })
    if (!user) {
        res.status(401).json({ error: "Invalid credentials" })
        return
    }
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
        res.status(401).json({ error: "Invalid credentials" })
        return
    }
    const token = jwt.sign(                                   
    { userId: user.id }, 
    process.env.JWT_SECRET!,
    { expiresIn: "7d" }     
  )                    
  res.json({ token })
  } catch (error) {
    res.status(500).json({ error: "Login failed" })
  }
})

export default router