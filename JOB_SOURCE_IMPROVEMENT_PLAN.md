# Job Sources & Job Search Improvement Plan

This document outlines a comprehensive plan to enhance the job sources and job search functionality in the FedJobs application, focusing on efficiency, user experience, and integration with the document generation features.

## 1. Job Source Caching Across Users

### Current Implementation
- Each user independently triggers job source crawling
- Duplicate crawling of the same job sources wastes resources
- No shared repository of job source data

### Proposed Solution
- Implement global job source cache
- Track job source URLs and last crawl dates at application level
- Share job postings across users while maintaining user-specific interactions

```typescript
// Schema changes
interface CachedJobSource {
  url: string;
  lastCrawled: Date;
  expiresAt: Date;
  refreshFrequency: 'DAILY' | 'WEEKLY';
  jobCount: number;
}

// Repository method for checking cache status
async checkCacheStatus(url: string): Promise<CachedJobSource | null> {
  // Return cached source data if it exists and is not expired
}

// Modify job source refresh logic in JobScraperService
async refreshJobSource(sourceId: number, options: RefreshOptions) {
  const source = await jobSourceRepo.getById(sourceId);
  const cachedSource = await cacheRepo.checkCacheStatus(source.url);
  
  // Use cached data if available and recent
  if (cachedSource && cachedSource.expiresAt > new Date()) {
    // Copy jobs from cache instead of crawling
    await copyJobsFromCache(source.id, cachedSource);
    return;
  }
  
  // Otherwise proceed with crawling as normal
  // ...crawling logic...
  
  // Update cache after crawling
  await updateJobSourceCache(source.url, jobs.length);
}
```

### Benefits
- Significantly reduced server load
- Faster job source creation for users
- More consistent job data across the application

## 2. Automated Job Source Updates with GitHub Actions

### Current Implementation
- Job sources are updated only when manually triggered
- No automatic refresh mechanism for popular job sources
- User must initiate refresh to see new jobs

### Proposed Solution
- Create a GitHub Action workflow to refresh job sources on a schedule
- Prioritize sources based on user engagement metrics
- Update all users' job feeds with new postings

```yaml
# .github/workflows/refresh-job-sources.yml
name: Refresh Job Sources

on:
  schedule:
    # Run every night at 1 AM UTC
    - cron: '0 1 * * *'
  workflow_dispatch: # Allow manual triggering

jobs:
  refresh-sources:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium
      
      - name: Run job source refresh script
        run: node scripts/refresh-popular-job-sources.js
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

### Backend Script Implementation
Create a new script that:
1. Identifies the most viewed/used job sources
2. Refreshes them in order of popularity
3. Logs results and sends notifications on completion

```typescript
// scripts/refresh-popular-job-sources.js
async function refreshPopularJobSources() {
  // Find job sources with high interaction counts
  const popularSources = await getPopularJobSources();
  
  // Refresh each source
  for (const source of popularSources) {
    try {
      await jobScraperService.refreshJobSource(source.id);
      console.log(`Refreshed source ${source.id}: ${source.name}`);
    } catch (error) {
      console.error(`Error refreshing source ${source.id}:`, error);
    }
  }
}
```

### Benefits
- Always fresh job data without user intervention
- Prioritized updates for popular job sites
- Reduced load by running during off-peak hours

## 3. Integrating Jobs with Document Generation

### Current Implementation
- No direct connection between jobs and document generation
- Users must manually copy job information
- Job selection preferences not recorded for future use

### Proposed Solution
1. Add direct "Generate for this job" links from job listings
2. Implement job selection in generation workflow
3. Store association between generated documents and jobs

```typescript
// Schema additions - link generations to job postings
interface DocumentGenerationMetadata {
  jobId?: number; // Link to specific job
  jobTitle?: string; // Cache job title
  jobOrganization?: string; // Cache job organization
}

// Add to generations table schema
jobId: integer("job_id").references(() => jobPostings.id),
jobMetadata: json("job_metadata")
```

### UI Enhancements:
1. Add "Generate Resume" and "Generate Cover Letter" buttons to JobDetailPanel
2. Create a job selector in the generation page that prioritizes jobs marked as "interested"
3. Show previously generated documents for each job in the job details panel

```tsx
// Add to JobDetailPanel.tsx
const generateButtons = (
  <div className="flex space-x-2 mt-4">
    <Button
      onClick={() => router.push(`/generate/resume?jobId=${job.id}`)}
      variant="primary"
      size="sm"
    >
      Generate Resume
    </Button>
    <Button
      onClick={() => router.push(`/generate/cover-letter?jobId=${job.id}`)}
      variant="primary"
      size="sm"
    >
      Generate Cover Letter
    </Button>
  </div>
);

// JobSelector component for generation page
function JobSelector({ onSelect }) {
  const [jobs, setJobs] = useState([]);
  
  useEffect(() => {
    async function loadJobs() {
      // First load interested jobs, then recent jobs
      const interestedJobs = await getUserJobFeedback(userId, 'INTERESTED');
      const jobDetails = await getJobsByIds(interestedJobs.map(f => f.jobId));
      setJobs(jobDetails);
    }
    loadJobs();
  }, []);
  
  return (
    <div className="job-selector">
      <h3>Select a job to target</h3>
      {jobs.map(job => (
        <div 
          key={job.id} 
          className="job-item" 
          onClick={() => onSelect(job)}
        >
          <div className="job-title">{job.title}</div>
          <div className="job-org">{job.organization}</div>
        </div>
      ))}
    </div>
  );
}
```

### Benefits
- Streamlined user workflow from job discovery to application
- Context-aware document generation based on specific jobs
- Better organization of documents by their intended purpose

## 4. Improving Job Search Functionality

### Current Implementation
- Basic string matching without proper text normalization
- No fuzzy matching for search terms
- Limited filtering capabilities
- No full-text search indexing

### Proposed Solution
- Implement proper text normalization
- Add fuzzy search capability for better matching
- Enhance search filters and sorting options
- Implement full-text search indexing

```typescript
// Enhanced search implementation
async searchJobs(
  searchParams: {
    keywords?: string;
    location?: string;
    organization?: string;
    // other params...
  }
): Promise<JobPostingRecord[]> {
  // Normalize search terms
  const normalizedKeywords = searchParams.keywords?.toLowerCase().trim();
  
  // Build search query with fuzzy matching
  const conditions = [];
  
  if (normalizedKeywords) {
    // Split into individual terms for better matching
    const terms = normalizedKeywords.split(/\s+/).filter(term => term.length > 2);
    
    // Create conditions for each term with fuzzy matching
    const keywordConditions = terms.map(term => 
      sql`(
        similarity(lower(${jobPostings.title}), ${term}) > 0.3 OR
        similarity(lower(${jobPostings.description}), ${term}) > 0.3 OR
        lower(${jobPostings.title}) LIKE ${`%${term}%`} OR
        lower(${jobPostings.description}) LIKE ${`%${term}%`}
      )`
    );
    
    // Add combined condition
    if (keywordConditions.length > 0) {
      conditions.push(or(...keywordConditions));
    }
  }
  
  // Add other filters with proper normalization
  if (searchParams.location) {
    const normalizedLocation = searchParams.location.toLowerCase().trim();
    conditions.push(
      or(
        sql`similarity(lower(${jobPostings.location}), ${normalizedLocation}) > 0.3`,
        sql`lower(${jobPostings.location}) LIKE ${`%${normalizedLocation}%`}`
      )
    );
  }
  
  // ... handle other filters ...
  
  // Execute search with proper sorting options
  return await db.select()
    .from(jobPostings)
    .where(and(...conditions))
    .orderBy(desc(jobPostings.datePosted))
    .limit(searchParams.limit || 50);
}
```

### Schema additions for full-text search
```sql
-- Add full text search capabilities with PostgreSQL
ALTER TABLE job_postings ADD COLUMN search_vector tsvector;

-- Create function to update search vector
CREATE FUNCTION job_postings_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.organization, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- Create trigger for automatic updates
CREATE TRIGGER job_postings_search_vector_update
BEFORE INSERT OR UPDATE ON job_postings
FOR EACH ROW EXECUTE FUNCTION job_postings_search_vector_update();

-- Create index for full-text search
CREATE INDEX job_postings_search_idx ON job_postings USING GIN (search_vector);
```

### Benefits
- More relevant search results
- Better handling of typos and variations
- Faster search performance with proper indexing
- Enhanced user experience with more accurate results

## 5. Enhanced Crawler with Pagination Support

### Current Implementation
- Limited to the first page of job listings
- No memory of previously crawled pages
- Inefficient crawling of already-visited URLs

### Proposed Solution
- Add support for detecting and following pagination links
- Implement URL history tracking to avoid revisiting pages
- Respect crawl rate limits to avoid overloading sites

```typescript
// Enhanced crawler with pagination and history
export class JobCrawlerService {
  private urlHistory: Map<string, Date> = new Map();
  private readonly HISTORY_EXPIRATION = 24 * 60 * 60 * 1000; // 24 hours
  
  // Check if URL was recently visited
  private isRecentlyVisited(url: string): boolean {
    const visitTime = this.urlHistory.get(url);
    if (!visitTime) return false;
    
    const now = new Date();
    return now.getTime() - visitTime.getTime() < this.HISTORY_EXPIRATION;
  }
  
  // Record URL visit
  private recordVisit(url: string): void {
    this.urlHistory.set(url, new Date());
  }
  
  // Modified requestHandler with pagination detection
  async requestHandler({ request, page, enqueueLinks }) {
    const url = request.url;
    
    // Skip if recently visited
    if (this.isRecentlyVisited(url)) {
      console.log(`[JobCrawler] Skipping recently visited URL: ${url}`);
      return;
    }
    
    // Record this visit
    this.recordVisit(url);
    
    // Process page as normal...
    
    // Detect pagination links
    const paginationLinks = await page.evaluate(() => {
      // Look for common pagination patterns
      const links = Array.from(document.querySelectorAll(
        'a[href*="page="], .pagination a, [aria-label*="Next"], [aria-label*="Page"]'
      ));
      
      return links.map(a => ({
        href: a.href,
        text: a.textContent?.trim() || '',
        isPagination: true
      }));
    });
    
    if (paginationLinks.length > 0) {
      console.log(`[JobCrawler] Found ${paginationLinks.length} pagination links`);
      
      // Enqueue pagination links with high priority
      await enqueueLinks({
        urls: paginationLinks.map(link => link.href),
        transformRequestFunction: req => {
          req.userData = { ...req.userData, isPagination: true, priority: 3 };
          return req;
        }
      });
    }
  }
}
```

### Persistent URL history using database
```typescript
// Schema for crawler history
interface CrawlerHistoryEntry {
  url: string;
  visitedAt: Date;
  sourceId: number;
  jobsFound: number;
}

// Save visited URLs to database
async saveUrlToHistory(url: string, sourceId: number, jobsFound: number): Promise<void> {
  await db.insert(crawlerHistory).values({
    url,
    visitedAt: new Date(),
    sourceId,
    jobsFound
  });
}

// Check database for recent visits
async wasRecentlyVisited(url: string): Promise<boolean> {
  const cutoff = new Date(Date.now() - this.HISTORY_EXPIRATION);
  
  const result = await db
    .select()
    .from(crawlerHistory)
    .where(and(
      eq(crawlerHistory.url, url),
      gt(crawlerHistory.visitedAt, cutoff)
    ))
    .limit(1);
  
  return result.length > 0;
}
```

### Benefits
- Comprehensive coverage of multi-page job listings
- Efficient crawling by avoiding redundant page visits
- Better resource utilization with smart crawling logic
- Improved job discovery through deeper site exploration

## 6. Document-Job Association

### Current Implementation
- No clear association between generated documents and target jobs
- Difficult to track which documents were created for which jobs
- No quick way to access documents relevant to a specific job application

### Proposed Solution
- Create direct relationships between documents and jobs
- Display associated documents when viewing job details
- Track job application progress with document status

```typescript
// Schema additions
// Add to generations table
jobId: integer("job_id").references(() => jobPostings.id),

// Add to documents table
targetJobId: integer("target_job_id").references(() => jobPostings.id),
applicationStatus: pgEnum("application_status", [
  "DRAFT",
  "READY",
  "SUBMITTED",
  "INTERVIEWING",
  "ACCEPTED",
  "REJECTED"
]),
```

### UI for Application Tracking
```tsx
// Component to show documents related to a job
function JobApplicationDocuments({ jobId }) {
  const [documents, setDocuments] = useState([]);
  
  useEffect(() => {
    async function loadDocuments() {
      const docs = await getDocumentsByJobId(jobId);
      setDocuments(docs);
    }
    loadDocuments();
  }, [jobId]);
  
  return (
    <div className="application-documents">
      <h3>Application Documents</h3>
      {documents.map(doc => (
        <div key={doc.id} className="document-item">
          <div className="document-type">{doc.type}</div>
          <div className="document-name">{doc.name}</div>
          <div className="document-status">{doc.applicationStatus}</div>
          <div className="document-actions">
            <Button onClick={() => viewDocument(doc.id)}>View</Button>
            <Button onClick={() => updateStatus(doc.id)}>Update Status</Button>
          </div>
        </div>
      ))}
    </div>
  );
}
```

### Benefits
- Clear organization of documents by job application
- Better tracking of application status and progress
- Improved user experience for managing multiple applications
- More insightful analytics on application effectiveness

## Implementation Timeline

### Phase 1: Foundation (Weeks 1-2)
- Implement job source caching across users
- Create database schema updates for document-job associations
- Improve basic job search functionality with text normalization

### Phase 2: Enhanced Features (Weeks 3-4)
- Develop GitHub Action for automated job source updates
- Build UI for job-to-generation integration
- Implement enhanced crawler with pagination support

### Phase 3: Refinement (Weeks 5-6)
- Implement full-text search and fuzzy matching
- Develop application tracking interface
- Create analytics dashboard for job search effectiveness

## Conclusion

This improvement plan addresses key limitations in the current job sources and search functionality while creating stronger integration between job discovery and document generation. By implementing these changes, we will create a more cohesive, efficient, and user-friendly platform that provides significant value throughout the entire federal job application process.

The plan balances immediate improvements with longer-term architectural enhancements, ensuring that we can deliver incremental value while building toward a more robust and scalable system.