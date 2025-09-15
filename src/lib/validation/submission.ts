import { z } from 'zod'

export const submissionSchema = z.object({
  url: z.string().url('Please enter a valid URL.'),
  title: z.string().min(2, 'Title is too short').max(100, 'Title is too long'),
  description: z.string().min(10, 'Description is too short').max(1000, 'Description is too long'),
  category_id: z.string().uuid('Please select a category'),
  pricing: z.enum(['unknown', 'free', 'freemium', 'trial', 'paid']),
  tags: z.array(z.string().min(2)).min(1, 'Please enter at least one tag'),
  logo_url: z.string().url('Logo must be a valid URL').optional().or(z.literal('')),
  contact_email: z.string().email('Please provide a valid email').optional().or(z.literal('')),
})

export type SubmissionInput = z.infer<typeof submissionSchema>