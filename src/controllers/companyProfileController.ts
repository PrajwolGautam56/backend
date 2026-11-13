import { Request, Response } from 'express';
import CompanyProfile from '../models/CompanyProfile';
import logger from '../utils/logger';

const defaultProfile = {
  description: 'BrokerIn Pvt. Ltd. helps people explore property, furniture and home services in Bengaluru.',
  leaders: [
    { name: 'Santhosh Srinivas', title: 'Founder & CEO', description: '', image: '/owner.JPG' },
    { name: 'Gopi krishna D', title: 'Operations Manager', description: '', image: '/gopi-krishna.jpg' }
  ],
  socialLinks: { facebook: '', instagram: '', linkedin: '', youtube: '', whatsapp: '' }
};

export const getCompanyProfile = async (_req: Request, res: Response): Promise<void> => {
  try {
    const profile = await CompanyProfile.findOne().lean();
    res.json({ success: true, data: profile || defaultProfile });
  } catch (error) {
    logger.error('Could not load company profile', error);
    res.status(500).json({ success: false, message: 'Could not load company profile' });
  }
};

export const updateCompanyProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const leaders = Array.isArray(req.body.leaders) ? req.body.leaders.slice(0, 8).map((leader: any) => ({
      name: String(leader.name || '').trim(),
      title: String(leader.title || '').trim(),
      description: String(leader.description || '').trim(),
      image: String(leader.image || '').trim()
    })).filter((leader: any) => leader.name && leader.title) : [];
    const profile = await CompanyProfile.findOneAndUpdate({}, {
      description: String(req.body.description || '').trim(),
      leaders,
      socialLinks: req.body.socialLinks || {}
    }, { new: true, upsert: true, setDefaultsOnInsert: true });
    res.json({ success: true, data: profile, message: 'Company profile saved successfully' });
  } catch (error) {
    logger.error('Could not update company profile', error);
    res.status(500).json({ success: false, message: 'Could not save company profile' });
  }
};

export const uploadLeaderPhoto = async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ success: false, message: 'Please choose an image file' });
    return;
  }
  res.status(201).json({ success: true, data: { url: `/uploads/profile-pictures/${req.file.filename}` } });
};
