// apps/api/src/services/index.ts
import { 
    JobSourceRepository, 
    JobPostingRepository,
    ParsingRepository,
    DocumentRepository,
    PositionRepository,
    GenerationRepository,
    db
  } from '@fedjobs/database';
  
  // Import services
  import { JobSourceService } from './jobs/jobSourceService';
  import { JobPostingService } from './jobs/jobPostingService';
  import { ParsingService } from './parsing/parsingService';
  import { WebSocketManager } from './realtime/webSocketManager';
  import { DocumentService } from './document/documentService';
  import { GenerationService } from './generation/generationService';
  
  // Import controllers
  import { JobSourceController } from '../controllers/jobController';
  import { ParsingController } from '../controllers/parseController';
  import { DocumentController } from '../controllers/documentController';
  import { GenerationController } from '../controllers/generationController';
  
  /**
   * Interface for application services container
   */
  export interface Services {
    // Repositories
    jobSourceRepo: JobSourceRepository;
    jobPostingRepo: JobPostingRepository;
    parsingRepo: ParsingRepository;
    documentRepo: DocumentRepository;
    positionRepo: PositionRepository;
    generationRepo: GenerationRepository;
    
    // Services
    jobSourceService: JobSourceService;
    jobPostingService: JobPostingService;
    parsingService: ParsingService;
    documentService: DocumentService;
    generationService: GenerationService;
    
    // WebSocket manager - shared global instance
    wsManager: WebSocketManager;
    
    // Controllers
    jobSourceController: JobSourceController;
    parsingController: ParsingController;
    documentController: DocumentController;
    generationController: GenerationController;
  }
  
  let servicesInstance: Services | null = null;
  
  /**
   * Create application services
   */
  export function createServices(wsManager: WebSocketManager): Services {
    // Repositories
    const jobSourceRepo = new JobSourceRepository();
    const jobPostingRepo = new JobPostingRepository();
    const parsingRepo = new ParsingRepository();
    const documentRepo = new DocumentRepository();
    const positionRepo = new PositionRepository();
    const generationRepo = new GenerationRepository();
    
    // Services
    const jobSourceService = new JobSourceService(jobSourceRepo, wsManager);
    const jobPostingService = new JobPostingService(jobPostingRepo);
    const parsingService = new ParsingService(parsingRepo, documentRepo, positionRepo);
    const documentService = new DocumentService(documentRepo);
    const generationService = new GenerationService(generationRepo);
    
    // Controllers
    const jobSourceController = new JobSourceController(
      jobSourceService,
      jobPostingService,
      wsManager
    );
    
    const parsingController = new ParsingController(
      parsingService,
      wsManager
    );
    
    const documentController = new DocumentController(
      documentService
    );
    
    const generationController = new GenerationController(
      generationService
    );
    
    // Create services container
    const services: Services = {
      // Repositories
      jobSourceRepo,
      jobPostingRepo,
      parsingRepo,
      documentRepo,
      positionRepo,
      generationRepo,
      
      // Services
      jobSourceService,
      jobPostingService,
      parsingService,
      documentService,
      generationService,
      
      // WebSocket manager
      wsManager,
      
      // Controllers
      jobSourceController,
      parsingController,
      documentController,
      generationController,
    };
    
    return services;
  }
  
  /**
   * Get the services instance, creating it if necessary
   */
  export function getServices(wsManager: WebSocketManager): Services {
    if (!servicesInstance) {
      servicesInstance = createServices(wsManager);
    }
    return servicesInstance;
  }
  
  /**
   * Reset services (mainly for testing)
   */
  export function resetServices(): void {
    servicesInstance = null;
  }