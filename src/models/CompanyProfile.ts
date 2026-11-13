import mongoose, { Document, Schema } from 'mongoose';

interface ILeader {
  name: string;
  title: string;
  description?: string;
  image?: string;
}

export interface ICompanyProfile extends Document {
  description: string;
  leaders: ILeader[];
  socialLinks: Record<string, string>;
}

const CompanyProfileSchema = new Schema<ICompanyProfile>({
  description: { type: String, default: '', maxlength: 3000 },
  leaders: [{
    name: { type: String, required: true, trim: true, maxlength: 120 },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, default: '', maxlength: 1000 },
    image: { type: String, default: '' }
  }],
  socialLinks: {
    facebook: { type: String, default: '' },
    instagram: { type: String, default: '' },
    linkedin: { type: String, default: '' },
    youtube: { type: String, default: '' },
    whatsapp: { type: String, default: '' }
  }
}, { timestamps: true });

export default mongoose.models.CompanyProfile || mongoose.model<ICompanyProfile>('CompanyProfile', CompanyProfileSchema);
