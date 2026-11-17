
import  { pool }  from '../config/db.js';
import { applicationValidator, applicationUpdateValidator } from '../validators/application.validator.js';
import { applicationStatusSchema, dateSchema } from '../validators/application.validator.js';

export const healthCheck = (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Job Application Tracker API is running'
  });
};

export const fetchApplications = async (req, res) => {

  const status = req.query.status;
  const company = req.query.company;
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;
  const position = req.query.position;
  const search = req.query.search;
  const sortBy = req.query.sortBy ?? 'dateApplied';
  const order = req.query.order ?? 'desc';

  const userId = req.user.userId;
  const page = Number(req.query.page  ?? 1);
  const limit = Number(req.query.limit ?? 10);

  const allowedSortFields = {
    dateApplied: 'applications.dateapplied',
    position: 'applications.position',
    company: 'companies.name',
    status: 'applications.status'
  };

  const sortOrder = order.toUpperCase();

  const sortColumn = allowedSortFields[sortBy];

 //start date and end date validation
  if (startDate) {
    const validation = dateSchema.safeParse(startDate);

    if (!validation.success) {
      return res.status(400).json({
        message: 'Invalid start date',
        errors: validation.error.issues
      });
    }
  }

  if (endDate) {
    const validation = dateSchema.safeParse(endDate);

    if (!validation.success) {
      return res.status(400).json({
        message: 'Invalid end date',
        errors: validation.error.issues
      });
    }
  }
 
  if (startDate && endDate && startDate > endDate) {
    return res.status(400).json({
      message: 'Start date cannot be later than end date'
    });
  }
    
  

  if (
    page < 1 || 
    limit < 1 ||
    !Number.isInteger(page) ||
    !Number.isInteger(limit) || limit > 100
  ){
    return res.status(400).json({
      message: 'Page must be a positive integer and limit must be between 1 and 100'
    });
  }

  let filterQuery = `
    applications
    JOIN companies
    ON applications.companyid = companies.id
    WHERE applications.userid = $1
 `;

  const values = [userId];

  //status filter
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
      filterQuery += ` AND applications.status = $${values.length}`;
      
    } 

    //company filter
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

      filterQuery += ` AND companies.name = $${values.length}`;
      
    }

    //position filter
    if (position) {
      values.push(`%${position}%`);
      filterQuery += ` AND applications.position ILIKE $${values.length}`;
    }

    //start date filter
    if (startDate) {
      values.push(startDate)
      filterQuery += ` AND applications.dateapplied >= $${values.length}`;
    }

    //end date filter
    if (endDate) {
      values.push(endDate);
      filterQuery += ` AND applications.dateapplied <= $${values.length}`;
    }

    //general search
    if (search) {
      values.push(`%${search}%`);
      const searchPlaceholder = `$${values.length}`;

      filterQuery += ` AND (
        applications.position ILIKE ${searchPlaceholder}
        OR companies.name ILIKE ${searchPlaceholder}
        OR applications.location ILIKE ${searchPlaceholder}
      )`;
    }

    //sort
    if(!sortColumn){
     return res.status(400).json({
       message: 'Invalid sort field'
     })
    }

    //order
   if (sortOrder !== 'ASC' && sortOrder !== 'DESC') {
      return res.status(400).json({
        message: 'Invalid sort order'
      });
    }

    const countQuery = `SELECT COUNT(*) FROM ${filterQuery}`;

    const countResult = await pool.query(countQuery, values);

    const totalApplications = Number(countResult.rows[0].count);
    const totalPages = Math.ceil(totalApplications / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    const offset = (page - 1) * limit;

    // Keep filter values separate from pagination values
    const queryValues = [...values, limit, offset];

    const query = `
      SELECT
        applications.id,
        applications.position,
        applications.status,
        companies.name AS company_name,
        companies.location AS company_location,
        applications.location AS application_location,
        TO_CHAR(applications.dateapplied, 'YYYY-MM-DD') AS date_applied
      FROM ${filterQuery}
       ORDER BY ${sortColumn} ${sortOrder}, applications.id ASC
      LIMIT $${queryValues.length - 1}
      OFFSET $${queryValues.length}
    `;

    const result = await pool.query(query, queryValues);

    res.status(200).json({
      data: result.rows,
      pagination: {
        totalApplications,
        currentPage: page,
        limit,
        totalPages,
        hasNextPage,
        hasPreviousPage
      }
    });

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


