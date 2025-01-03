// File path: packages/types/src/JobTypes.ts
export type JobInfo = {
    jobPostingURL: string;
    jobDescription: string;
    job?: Job;
  };

export type Job = {
    MatchedObjectId: string;
    MatchedObjectDescriptor: {
        PositionID: string;
        PositionTitle: string;
        PositionURI: string;
        ApplyURI: string[];
        PositionLocationDisplay: string;
        PositionLocation: Array<{
            LocationName: string;
            CountryCode: string;
            CountrySubDivisionCode: string;
            CityName: string;
            Longitude: number;
            Latitude: number;
        }>;
        OrganizationName: string;
        DepartmentName: string;
        SubAgency: string;
        JobCategory: Array<{
            Name: string;
            Code: string;
        }>;
        JobGrade: Array<{
            Code: string;
        }>;
        PositionSchedule: Array<{
            Name: string;
            Code: string;
        }>;
        PositionOfferingType: Array<{
            Name: string;
            Code: string;
        }>;
        QualificationSummary: string;
        PositionRemuneration: Array<{
            MinimumRange: string;
            MaximumRange: string;
            RateIntervalCode: string;
            Description: string;
        }>;
        PositionStartDate: string;
        PositionEndDate: string;
        PublicationStartDate: string;
        ApplicationCloseDate: string;
        PositionFormattedDescription: Array<{
            Label: string;
            LabelDescription: string;
        }>;
        UserArea: {
            Details: {
                JobSummary: string;
                WhoMayApply: {
                    Name: string;
                    Code: string;
                };
                LowGrade: string;
                HighGrade: string;
                PromotionPotential: string;
                SubAgencyName: string;
                OrganizationCodes: string;
                Relocation: string;
                HiringPath: string[];
                TotalOpenings: string;
                AgencyMarketingStatement: string;
                TravelCode: string;
                ApplyOnlineUrl: string;
                DetailStatusUrl: string;
                MajorDuties: string[];
                Education: string;
                Requirements: string;
                Evaluations: string;
                HowToApply: string;
                WhatToExpectNext: string;
                RequiredDocuments: string;
                Benefits: string;
                BenefitsUrl: string;
                BenefitsDisplayDefaultText: boolean;
                OtherInformation: string;
                KeyRequirements: string[];
                WithinArea: boolean;
                CommuteDistance: string;
                ServiceType: string;
                AnnouncementClosingType: string;
                AgencyContactEmail: string;
                AgencyContactPhone: string;
                SecurityClearance: string;
                DrugTestRequired: boolean;
                PositionSensitivitiy: string;
                AdjudicationType: string[];
                TeleworkEligible: boolean;
                RemoteIndicator: boolean;
            };
        };
    };
    RelevanceRank: number;
};
