import jwt from 'jsonwebtoken';
import  pool  from '../config/db.js';
import bcrypt from 'bcrypt';
import { registerValidator, loginValidator } from '../validators/auth.validator.js';


export const registerUser = async (req, res) => {

 
  try {
    const validatedUser = registerValidator.safeParse(req.body);

    if (!validatedUser.success) {
      return res.status(400).json({
        message: 'Invalid input data',
        details: validatedUser.error.issues
      });
    }

    
    const { name, email, password } = validatedUser.data;
    
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        message: 'Email already exists'
      });
    }
   
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await pool.query(
      `
       INSERT INTO users (name, email, password)
       VALUES ($1, $2, $3) 
       RETURNING id, name, email
      `,
      [name, email, hashedPassword]
    );
      

    res.status(201).json({
      message: 'User registered successfully',
      user: newUser.rows[0]
    });

  } catch (err) {
    console.error('Error registering user:', err);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
};

export const loginUser = async (req, res) => {

  try {
    const validatedUser = loginValidator.safeParse(req.body);

    if (!validatedUser.success) {
      return res.status(400).json({
        message: 'Invalid input data',
        details: validatedUser.error.issues
      });
    }

    const { email, password } = validatedUser.data;

    const result = await pool.query(
      'SELECT id, name, email, password FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    const validPassword = await bcrypt.compare(
      password,
      result.rows[0].password
    );

    if (!validPassword) {
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }
    
    const user = result.rows[0];
    
    const token = jwt.sign(
      { userId: user.id},
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });

  } catch (err) {
    console.error('Error logging in user:', err);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
}