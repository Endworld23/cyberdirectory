'use client'

import * as React from 'react'
import PendingButton from '@/components/PendingButton'
import { submitResourceAction, fetchUrlMetadataAction, uploadLogoAction } from '@/app/resources/submit/actions'
import { useRouter } from 'next/navigation'
import { submissionSchema } from '@/lib/validation/submission'
import { toSlug } from '@/lib/slug'

export type SimpleOption = { id: string; name: string; slug: string }

export default function SubmissionForm({
  userEmail,
  categories,
  tags,
}: {
  userEmail: string
  categories: SimpleOption[]
  tags: SimpleOption[]
}) {
  const router = useRouter()
  const [url, setUrl] = React.useState('')
  const [title, setTitle] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [categoryId, setCategoryId] = React.useState('')
  const [pricing, setPricing] = React.useState<'unknown' | 'free' | 'freemium' | 'trial' | 'paid'>('unknown')
  const [tagSlugs, setTagSlugs] = React.useState<string[]>([])
  const [logoUrl, setLogoUrl] = React.useState<string>('')
  const [contactEmail, setContactEmail] = React.useState<string>(userEmail || '')

  // validation
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const derivedSlug = React.useMemo(() => (title ? toSlug(title) : ''), [title])

  const [metaLoading, setMetaLoading] = React.useState(false)
  const [metaError, setMetaError] = React.useState<string | null>(null)

  const [uploading, setUploading] = React.useState(false)
  const [uploadError, setUploadError] = React.useState<string | null>(null)

  const [serverErrors, setServerErrors] = React.useState<Record<string, string> | null>(null)

  React.useEffect(() => {
    const data = {
      url,
      title,
      description,
      category_id: categoryId || undefined,
      pricing,
      tags: tagSlugs,
      logo_url: logoUrl || undefined,
      contact_email: contactEmail || undefined,
    }
    const v = submissionSchema.safeParse(data)
    if (!v.success) {
      const map: Record<string, string> = {}
      for (const issue of v.error.issues) {
        const key = (issue.path?.[0] as string) || '_root'
        if (!map[key]) map[key] = issue.message
      }
      setErrors(map)
    } else {
      setErrors({})
    }
  }, [url, title, description, categoryId, pricing, tagSlugs, logoUrl, contactEmail])

  async function handleFetchMeta() {
    setMetaError(null)
    setMetaLoading(true)
    try {
      const res = await fetchUrlMetadataAction(url)
      if (!res?.ok) {
        setMetaError(res?.error || 'Could not fetch page metadata')
      } else {
        if (res.data?.title && !title) setTitle(res.data.title)
        if (res.data?.description && !description) setDescription(res.data.description)
        if (res.data?.favicon && !logoUrl) setLogoUrl(res.data.favicon)
      }
    } catch (e: any) {
      setMetaError(e?.message ?? 'Failed to fetch metadata')
    } finally {
      setMetaLoading(false)
    }
  }

  async function handleUpload(file: File) {
    setUploadError(null)
    setUploading(true)
    try {
      const fd = new FormData()
      fd.set('file', file)
      const res = await uploadLogoAction(fd)
      if (!res?.ok) {
        setUploadError(res?.error || 'Upload failed')
      } else if (res.url) {
        setLogoUrl(res.url)
      }
    } catch (e: any) {
      setUploadError(e?.message ?? 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  function onTagsInputChange(v: string) {
    const arr = v
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
    setTagSlugs(arr)
  }

  // Let the server action handle validation; capture its field errors via form action callback
  const formRef = React.useRef<HTMLFormElement>(null)
  const [submitting, startSubmit] = (React as any).useTransition?.() ?? [false, (fn: any) => fn()]

  async function clientSubmit(formData: FormData) {
    setServerErrors(null)
    const result = await submitResourceAction(formData)
    if (result && result.ok === false && result.errors) {
      setServerErrors(result.errors)
      return
    }
    // Success: client-side navigate
    router.push('/resources/submit/success')
  }

  const inputClass = (hasError?: boolean) =>
    `mt-1 w-full rounded-xl border px-3 py-2 ${hasError ? 'border-red-500 focus:outline-red-600' : ''}`

  const hasErrors = Object.keys(errors).length > 0

  return (
    <form
      ref={formRef}
      action={(fd) => {
        // ensure values sync
        fd.set('url', url)
        fd.set('title', title)
        fd.set('description', description)
        fd.set('pricing', pricing)
        if (categoryId) fd.set('category_id', categoryId)
        if (logoUrl) fd.set('logo_url', logoUrl)
        if (contactEmail) fd.set('contact_email', contactEmail)
        if (tagSlugs.length) fd.set('tags', tagSlugs.join(','))
        fd.set('slug', derivedSlug)
        return clientSubmit(fd)
      }}
      className="space-y-6"
    >
      {/* URL */}
      <div>
        <label className="block text-sm font-medium">URL *</label>
        <div className="mt-1 flex gap-2">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            required
            className={inputClass(!!errors.url)}
          />
          <button
            type="button"
            onClick={handleFetchMeta}
            className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
            disabled={!url || metaLoading}
          >
            {metaLoading ? 'Fetching…' : 'Fetch meta'}
          </button>
        </div>
        {metaError && <p className="mt-1 text-xs text-red-600">{metaError}</p>}
        {errors.url && <p className="mt-1 text-xs text-red-600">{errors.url}</p>}
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm font-medium">Title *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          minLength={3}
          className={inputClass(!!errors.title)}
        />
        {derivedSlug && (
          <p className="mt-1 text-xs text-gray-500">Slug preview: <code>{derivedSlug}</code></p>
        )}
        {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title}</p>}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className={inputClass(!!errors.description)}
        />
        {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description}</p>}
      </div>

      {/* Category & Pricing */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium">Category</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={inputClass(!!errors.category_id)}
          >
            <option value="">Select…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {errors.category_id && <p className="mt-1 text-xs text-red-600">{errors.category_id}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium">Pricing</label>
          <select
            value={pricing}
            onChange={(e) => setPricing(e.target.value as any)}
            className="mt-1 w-full rounded-xl border px-3 py-2"
          >
            <option value="unknown">Unknown</option>
            <option value="free">Free</option>
            <option value="freemium">Freemium</option>
            <option value="trial">Trial</option>
            <option value="paid">Paid</option>
          </select>
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium">Tags</label>
        <input
          type="text"
          placeholder="comma-separated, e.g. web, awareness"
          defaultValue={''}
          onChange={(e) => onTagsInputChange(e.target.value)}
          className={inputClass(!!errors.tags)}
        />
        {tags?.length ? (
          <p className="mt-1 text-xs text-gray-500">Suggestions: {tags.slice(0, 10).map((t) => t.slug).join(', ')}…</p>
        ) : null}
        {errors.tags && <p className="mt-1 text-xs text-red-600">{errors.tags}</p>}
      </div>

      {/* Logo uploader */}
      <div>
        <label className="block text-sm font-medium">Logo</label>
        <div className="mt-1 flex items-center gap-3">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleUpload(file)
            }}
          />
          {uploading && <span className="text-xs text-gray-600">Uploading…</span>}
          {uploadError && <span className="text-xs text-red-600">{uploadError}</span>}
        </div>
        {logoUrl && (
          <div className="mt-2 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt="logo preview" className="h-12 w-12 rounded-md border object-cover" />
            <code className="text-xs text-gray-600 break-all">{logoUrl}</code>
          </div>
        )}
        {errors.logo_url && <p className="mt-1 text-xs text-red-600">{errors.logo_url}</p>}
        {/* Keep a hidden input so the server action receives the current logo url */}
        <input type="hidden" name="logo_url" value={logoUrl} readOnly />
      </div>

      {/* Contact email */}
      <div>
        <label className="block text-sm font-medium">Contact email</label>
        <input
          type="email"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          placeholder="name@example.com"
          className={inputClass(!!errors.contact_email)}
        />
        {errors.contact_email && <p className="mt-1 text-xs text-red-600">{errors.contact_email}</p>}
      </div>

      {/* Server-side field errors */}
      {serverErrors && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {serverErrors._root ? <p>{serverErrors._root}</p> : <p>Fix the highlighted fields and try again.</p>}
          <ul className="mt-1 list-inside">
            {Object.entries(serverErrors)
              .filter(([k]) => k !== '_root')
              .map(([k, v]) => (
                <li key={k} className="text-xs">{k}: {v}</li>
              ))}
          </ul>
        </div>
      )}

      {/* Hidden fields synced for server action */}
      <input type="hidden" name="url" value={url} readOnly />
      <input type="hidden" name="title" value={title} readOnly />
      <input type="hidden" name="description" value={description} readOnly />
      <input type="hidden" name="pricing" value={pricing} readOnly />
      <input type="hidden" name="category_id" value={categoryId} readOnly />
      <input type="hidden" name="tags" value={tagSlugs.join(',')} readOnly />
      <input type="hidden" name="contact_email" value={contactEmail} readOnly />
      <input type="hidden" name="slug" value={derivedSlug} readOnly />

      {/* Submit */}
      <div className="flex items-center gap-3">
        <PendingButton
          className="rounded-xl bg-black px-4 py-2 text-white"
          pendingText="Submitting…"
          title="Submit resource"
          disabled={hasErrors || uploading || metaLoading}
        >
          Submit
        </PendingButton>
        <span className="text-xs text-gray-600">Submissions are reviewed before publishing.</span>
      </div>
    </form>
  )
}