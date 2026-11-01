import pool from '../config/db.js';
import { createCompanyValidator, updateCompanyValidator } from '../validators/company.validator.js';

export const createCompany = async (req, res) => {
  try {
    const userId = req.user.userId;
    const validatedData = createCompanyValidator.safeParse(req.body);

    if (!validatedData.success) {
      return res.status(400).json({ message: 'Invalid company data', errors: validatedData.error.issues });
    }

    const result = await pool.query(
      'INSERT INTO companies (name, website, location, userid) VALUES ($1, $2, $3, $4) RETURNING *',
      [validatedData.data.name, validatedData.data.website, validatedData.data.location, userId]
    );
    
    res.status(201).json({ message: 'Company created successfully', data: result.rows[0] });
  } catch (error) {
    console.error('Error creating company:', error);
    return res.status(500).json({
     message: 'Error creating company'
   });
  }
};

export const fetchCompanies = async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await pool.query(`
      SELECT * FROM companies WHERE userid = $1`, 
      [userId]
    );
    res.status(200).json({ data: result.rows });
  } catch (error) {
    console.error('Error fetching companies:', error);
    return res.status(500).json({
      message: 'Error fetching companies'
    });
  }
};

export const fetchCompanyById = async (req, res) => {
  try {
    const userId = req.user.userId;
    const companyId = req.params.id;

    const result = await pool.query(
      `SELECT * FROM companies WHERE id = $1 AND userid = $2`,
      [companyId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Company not found' });
    }

    res.status(200).json({ data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching company:', error);
    return res.status(500).json({
      message: 'Error fetching company'
    });
  }
};

export const updateCompany = async (req, res) => {
  try {
    const userId = req.user.userId;
    const companyId = req.params.id;
    const validatedData = updateCompanyValidator.safeParse(req.body);

    if (!validatedData.success) {
      return res.status(400).json({ message: 'Invalid company data', errors: validatedData.error.issues });
    }

    const result = await pool.query(
      `UPDATE companies SET name = COALESCE($1, name), website = COALESCE($2, website), location = COALESCE($3, location) WHERE id = $4 AND userid = $5 RETURNING *`,
      [validatedData.data.name, validatedData.data.website, validatedData.data.location, companyId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Company not found' });
    }

    res.status(200).json({ message: 'Company updated successfully', data: result.rows[0] });
  } catch (error) {
    console.error('Error updating company:', error);
    return res.status(500).json({
      message: 'Error updating company'
    });
  }
};

export const deleteCompany = async (req, res) => {
  try {
    const userId = req.user.userId;
    const companyId = req.params.id;

    const result = await pool.query(
      `DELETE FROM companies WHERE id = $1 AND userid = $2 RETURNING *`,
      [companyId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Company not found' });
    }

    res.status(200).json({ message: 'Company deleted successfully', data: result.rows[0] });
  } catch (error) {
    console.error('Error deleting company:', error);

    if (error.code === '23503') {
      return res.status(409).json({
      message: 'Cannot delete company because it has existing applications'
      });
    }

    return res.status(500).json({
      message: 'Error deleting company'
    });
  }
};