import { pool } from '../config/db.js';
import { interviewValidator } from '../validators/interview.validator.js';

export const createInterview = async (req, res) => {

  try {
   const validation = interviewValidator.safeParse(req.body);

    if (!validation.success) {
        return res.status(400).json({
            message: 'Invalid interview data',
            errors: validation.error.issues
        });
    }

    const userId = req.user.userId;

    const {
      application_id,
      interview_date,
      interview_time,
      timezone,
      interview_type,
      location,
      meeting_link,
      notes
    } = validation.data;

    const applicationResult = await pool.query(
      `SELECT id, status
      FROM applications
      WHERE id = $1
      AND userid = $2`,
      [application_id, userId]
    );

    if (applicationResult.rows.length === 0) {
      return res.status(404).json({
        message: 'Application not found'
      });
    }

    if (applicationResult.rows[0].status !== 'Interview') {
      return res.status(409).json({
        message: 'Interviews can only be scheduled for applications with Interview status'
      });
    }

    const result = await pool.query(
      `INSERT INTO interviews (
        application_id,
        interview_date,
        interview_time,
        timezone,
        interview_type,
        location,
        meeting_link,
        notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;`,
      [application_id, interview_date, interview_time, timezone, interview_type, location ?? null, meeting_link ?? null, notes ?? null]
    );
    
    return res.status(201).json({
      message: 'Interview created successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error creating interview:', error);
    return res.status(500).json({
      message: 'Internal server error'
    });
 }
};