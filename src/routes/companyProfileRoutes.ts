import express from 'express';
import { getCompanyProfile } from '../controllers/companyProfileController';

const router = express.Router();
router.get('/', getCompanyProfile);
export default router;
