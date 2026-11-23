import { pool } from '../config/db.js';
import { interviewValidator, updateInterviewValidator, interviewIdValidator, rescheduleInterviewValidator } from '../validators/interview.validator.js';


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

export const fetchInterviews = async (req, res) => {
  try{
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT interviews.*
      FROM interviews
      JOIN applications
      ON interviews.application_id = applications.id
      WHERE applications.userid = $1
      ORDER BY interviews.interview_date ASC,
        interviews.interview_time ASC;`,
      [userId]  
    );

    return res.status(200).json({
    message: 'Interviews retrieved successfully',
    data: result.rows
    })
 
  } catch (error) {
    console.error('Error fetching interviews:', error);
    return res.status(500).json({
      message: 'Internal server error'
    });
  }
}

export const fetchInterviewById = async (req, res) => {

  try{
    const id  = req.params.id;
    const userId = req.user.userId;

    const validation = interviewIdValidator.safeParse(id);

    if (!validation.success) {
    return res.status(400).json({
      message: 'Invalid interview ID',
      errors: validation.error.issues
    });
    }

    const result = await pool.query(
      `SELECT interviews.*
      FROM interviews
      JOIN applications
      ON interviews.application_id = applications.id
      WHERE interviews.id = $1
      AND applications.userid = $2;`,
      [id, userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Interview not found'
      })
    }

    return res.status(200).json({
      message: 'Interview retrieved successfully',
      data: result.rows[0]
    })

  } catch(error) {
    console.error('Error fetching interview:', error);
    return res.status(500).json({
      message: 'Internal server error'
    });
  }

}

export const updateInterview = async(req, res) => {

  try {
    const id  = req.params.id;
    const idValidation = interviewIdValidator.safeParse(id);

    if (!idValidation.success) {
      return res.status(400).json({
        message: 'Invalid interview ID',
        errors: idValidation.error.issues
      });
    }

    const validation = updateInterviewValidator.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        message: 'Invalid interview data',
        errors: validation.error.issues
      });
    }

    const userId = req.user.userId;

    const interviewResult = await pool.query(
    `SELECT interviews.*
      FROM interviews
      JOIN applications
      ON interviews.application_id = applications.id
      WHERE interviews.id = $1
      AND applications.userid = $2`,
      [id, userId]
    );

    if (interviewResult.rows.length === 0) {
      return res.status(404).json({
        message: 'Interview not found'
      });
    }

    if (interviewResult.rows[0].status !== 'Scheduled') {
      return res.status(409).json({
        message: 'Only interviews with the status of scheduled can be updated'
      });
    }
    
    const fields = Object.keys(validation.data);
    const values = Object.values(validation.data);

    const assignments = fields.map((field, index) => {
      return `${field} = $${index + 1}`;
    }).join(', ');

    values.push(id, userId);

    const query = `
      UPDATE interviews
      SET ${assignments}
      WHERE id = $${values.length - 1}
      AND status = 'Scheduled'
      AND EXISTS (
        SELECT 1
        FROM applications
        WHERE applications.id = interviews.application_id
        AND applications.userid = $${values.length}
      )
      RETURNING *;
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Interview not found or cannot be updated'
      });
    }

    return res.status(200).json({
      message: 'Interview updated successfully',
      data: result.rows[0]
    });

    

  } catch (error) {
    console.error('Error updating interview:', error);
    return res.status(500).json({
      message: 'Internal server error'
    });

  }

}

export const rescheduleInterview = async (req, res) => {

  let client;
  let transactionStarted = false; 

  try {
   const id  = req.params.id;
   const idValidation = interviewIdValidator.safeParse(id);

    if (!idValidation.success) {
      return res.status(400).json({
        message: 'Invalid interview ID',
        errors: idValidation.error.issues
      });
    }

    const validation = rescheduleInterviewValidator.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        message: 'Invalid interview data',
        errors: validation.error.issues
      });
    }

   client = await pool.connect();

   await client.query('BEGIN');
   transactionStarted = true;

   const userId = req.user.userId;

    const rescheduledInterviewResult = await client.query(
    `SELECT interviews.*
      FROM interviews
      JOIN applications
      ON interviews.application_id = applications.id
      WHERE interviews.id = $1
      AND applications.userid = $2
      FOR UPDATE OF interviews`,
      [id, userId]
    );

    if (rescheduledInterviewResult.rows.length === 0) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        message: 'Interview not found'
      });
    }

    if (rescheduledInterviewResult.rows[0].status !== 'Scheduled') {
      await client.query('ROLLBACK');
      transactionStarted = false;

      return res.status(409).json({
        message: 'Only scheduled interviews can be rescheduled'
      });
    }

    const original = rescheduledInterviewResult.rows[0];

    const newInterview = {
      interview_date: validation.data.interview_date,
      interview_time: validation.data.interview_time,

      timezone: validation.data.timezone ?? original.timezone,
      interview_type: validation.data.interview_type ?? original.interview_type,

      location: Object.hasOwn(validation.data, 'location')
      ? validation.data.location : original.location,

      meeting_link: Object.hasOwn(validation.data, 'meeting_link')
      ? validation.data.meeting_link : original.meeting_link,

      notes: Object.hasOwn(validation.data, 'notes')
      ? validation.data.notes : original.notes
    };

     await client.query(
      `UPDATE interviews
      SET status = 'Rescheduled'
      WHERE id = $1
      RETURNING *`,
      [id]
    )

    const newInterviewResult = await client.query(
      `INSERT INTO interviews (
        application_id, 
        interview_date, 
        interview_time,
        timezone, 
        interview_type, 
        location, 
        meeting_link, 
        notes, 
        rescheduled_from_interview_id 
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [original.application_id, newInterview.interview_date, newInterview.interview_time, newInterview.timezone, newInterview.interview_type, newInterview.location, newInterview.meeting_link, newInterview.notes, original.id ]
    )

    await client.query('COMMIT');
    transactionStarted = false;

    return res.status(201).json({
      message: 'Interview rescheduled successfully',
      data: newInterviewResult.rows[0]
    });


  } catch (error) {

    if (client && transactionStarted) {
      await client.query('ROLLBACK');
      transactionStarted = false;
    }

    console.error('Error rescheduling interview:', error);
    return res.status(500).json({
      message: 'Internal server error'
    });

  }finally {
    if (client) {
      client.release();
    }
  }
};

export const deleteInterview = async (req, res) => {
  try{
    const id  = req.params.id;
    const idValidation = interviewIdValidator.safeParse(id);

    if (!idValidation.success) {
      return res.status(400).json({
        message: 'Invalid interview ID',
        errors: idValidation.error.issues
      });
    }

    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT interviews.* 
      FROM interviews
      JOIN applications
      ON interviews.application_id = applications.id
      WHERE interviews.id = $1
      AND applications.userid = $2`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Interview not found'
      });
    }

    if (result.rows[0].status !== 'Scheduled') {
      return res.status(409).json({
        message: 'Only scheduled interviews can be deleted'
      });
    };

    const deleteResult = await pool.query(
      `DELETE FROM interviews
      WHERE id = $1
      AND status = 'Scheduled'
      AND EXISTS (
        SELECT 1
        FROM applications
        WHERE applications.id = interviews.application_id
        AND applications.userid = $2
      )
      RETURNING *`,
      [id, userId]
    )

    if (deleteResult.rows.length === 0) {
      return res.status(409).json({
        message: 'Interview could not be deleted because its status or ownership changed'
      });
    }

    return res.status(200).json({
      message: 'Interview deleted successfully',
      data: deleteResult.rows[0]
    });

  } catch (error) {
    console.error('Error deleting interview:', error);
    return res.status(500).json({
      message: 'Internal server error'
    });

  }

};
