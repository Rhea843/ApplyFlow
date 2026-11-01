import  pool  from '../config/db.js';
import { applicationValidator, applicationUpdateValidator } from '../validators/application.validator.js';
import { applicationStatusSchema } from '../validators/application.validator.js';

export const healthCheck = (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Job Application Tracker API is running'
  });
};

export const fetchApplications = async (req, res) => {

  const status = req.query.status;
  const company = req.query.company;
  const userId = req.user.userId;
  const page = parseInt(req.query.page  ?? 1);
  const limit = parseInt(req.query.limit ?? 10);
  const offset = (page - 1) * limit;

  if (
    page < 1 || 
    limit < 1 ||
    !Number.isInteger(page) ||
    !Number.isInteger(limit)
  ){
    return res.status(400).json({
      message: 'Page and limit must be positive integers'
    });
  }

  let query = `SELECT 
  applications.id, 
  applications.position, 
  applications.status, 
  companies.name AS company_name,  
  companies.location AS company_location,
  applications.location AS application_location,
  TO_CHAR(applications.dateapplied, 'YYYY-MM-DD') AS date_applied
  FROM applications
  JOIN companies
  ON applications.companyid = companies.id
  WHERE applications.userid = $1`

  const values = [userId];
  let hasWhere = true;

  try {
      
    if (status) {
      const validation = applicationStatusSchema.safeParse(status);

      if (!validation.success) {
        return res.status(400).json({
          message: 'Invalid status value',
          errors: validation.error.issues
        });
      }

      values.push(status);
      query += ` AND applications.status = $${values.length}`;
      
      hasWhere = true;
    } 

    if (company) {

      const companyResult = await pool.query(
       'SELECT id FROM companies WHERE name = $1 AND userid = $2',
       [company, userId]
      );

      if (companyResult.rows.length === 0) {
        return res.status(404).json({
          message: 'Company not found'
        });
      }

      values.push(company);

      if (hasWhere) {
        query += ` AND companies.name = $${values.length}`;
      } else {
        query += ` AND companies.name = $${values.length}`;
      }
      
    }

    values.push(limit);
    values.push(offset);
    query += ` LIMIT $${values.length - 1} OFFSET $${values.length}`;

    const result = await pool.query(query,values);
    res.status(200).json(result.rows);

  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ message: 'Error fetching applications' });
  }
};

export const createApplication = async (req, res) => {
  const userId = req.user.userId;

  const result = applicationValidator.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      message: 'Invalid application data',
      errors: result.error.issues
    });
  }
  try {
    const company = await pool.query(
      'SELECT id FROM companies WHERE id = $1 AND userid = $2',
      [result.data.companyid, userId]
    );

    if (company.rows.length === 0) {
      return res.status(404).json({
        message: 'Company not found'
      });
    }


    const application = await pool.query(
      `INSERT INTO applications 
      (dateapplied, userid, companyid, position, location, status) 
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [result.data.dateapplied, userId, result.data.companyid, result.data.position, result.data.location, result.data.status]
    );

    res.status(201).json(application.rows[0]);
  } catch (error) {
    console.error('Error creating application:', error);
    res.status(500).json({ message: 'Error creating application' });
  }
};


export const updateApplication = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;

  const fields = [];
  const values = [];

  const result = applicationUpdateValidator.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      message: 'Invalid application data',
      errors: result.error.issues
    });
  }

  for (const [key, value] of Object.entries(result.data)) {
    fields.push(`${key} = $${fields.length + 1}`);
    values.push(value);
  }
  try{
    if (fields.length === 0) {
     return res.status(400).json({ message: 'No fields to update' });
    } 

    if (result.data.companyid) {
      const company = await pool.query(
        'SELECT id FROM companies WHERE id = $1 AND userid = $2',
        [result.data.companyid, userId]
      );

      if (company.rows.length === 0) {
        return res.status(404).json({
          message: 'Company not found'
        });
      }
    }

    const application = await pool.query(
      `UPDATE applications SET ${fields.join(', ')} 
       WHERE id = $${fields.length + 1} AND userid = $${fields.length + 2}
       RETURNING *
      `,
      [...values, id, userId]
    );

    if (application.rows.length === 0) {
      return res.status(404).json({
        message: 'Application not found'
      });
    }

    res.status(200).json(application.rows[0]);
  }catch (error) {
    console.error('Error updating application:', error);
    res.status(500).json({ message: 'Error updating application' });
  }
};

export const deleteApplication = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;

  try {
    const application = await pool.query(
      'DELETE FROM applications WHERE id = $1 AND userid = $2 RETURNING *',
      [id, userId]
    );

    if (application.rows.length === 0) {
      return res.status(404).json({
        message: 'Application not found'
      });
    }

    res.status(200).json({
      message: 'Application deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting application:', error);
    res.status(500).json({ message: 'Error deleting application' });
  }
}
