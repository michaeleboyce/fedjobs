// File path: apps/web/app/shared/utils/Constants/index.ts
export * from './ECQConstants';

export const DUMMY_ANNOTATED_TEXT = `<html> 
<position> 
    <organization organization="Acme Inc.">ACME INC.</organization>
    <title title="Senior Developer">Senior Developer</title>
    <date startDate="01/01/2018" endDate="01/01/2020" present="false">January 2018 - January 2020</date>
    <details>
        <activity>Developing and maintaining software</activity>
        <accomplishment>Implemented a new feature that increased user engagement by 20%</accomplishment>
    </details>
</position> 
</html>`;

export const DUMMY_FULL_RESUME_NAME = `Resume-1706048129455.json`
export const DUMMY_FULL_RESUME_JSON = `{
  "positions": [
    {
      "organization": {
        "organization": "Executive Office of the President, Office of Management and Budget"
      },
      "title": {
        "title": "Program Examiner (Detailee), International Affairs Division, GS-15"
      },
      "date": {
        "startDate": "10/01/2022",
        "endDate": "present",
        "present": true
      },
      "details": {
        "activities": [],
        "accomplishments": [
          "Developed the Department of State’s FY 2025 Budget for its $2.8 billion in annual information technology spending, including providing “Passback” language for State’s Artificial Intelligence investments in close collaboration with its Chief Data and Artificial Intelligence Officer.",
          "Provided OMB comments in regards to State’s Technology Modernization Fund proposals related to Zero Trust and Artificial Intelligence.",
          "Oversaw over $3.5 billion in annual foreign assistance including more than $2 billion to Western Hemisphere countries, $1.5 billion for the Bureau of International Counter-Narcotics and Law Enforcement, and $100 million for State’s Office of the Inspector General.",
          "Represented OMB in interagency processes, including in Interagency Policy Committees on migration, foreign assistance and AI.",
          "Wrote a memo to National Security Advisor Jake Sullivan that secured $115 million dollars in funding for semiconductor, climate change, and migration management programs throughout the Americas."
        ]
      }
    },
    {
      "organization": {
        "organization": "Executive Office of the President, Office of Management and Budget"
      },
      "title": {
        "title": "Senior Policy Analyst (Fellow), Office of the Federal CIO, GS-15"
      },
      "date": {
        "startDate": "10/01/2022",
        "endDate": "10/01/2023",
        "present": false
      },
      "details": {
        "activities": [
          "Developed policy recommendations after leading the sub-Interagency Policy Committee on “AI Use in the Federal Government.”",
          "Worked closely with partners at the GSA, Department of Homeland Security (DHS), National Institute of Standards and Technology, and Department of Defense to write the policy.",
          "Led drafting of sections on automation and data interoperability, continuous monitoring and security, and authorization of cloud services."
        ],
        "accomplishments": [
          "Wrote key sections of the Executive Order on the Safe, Secure and Trustworthy Development and Use of Artificial Intelligence, specifically on generative AI use in the federal government.",
          "Additionally, wrote sections related to the National AI Talent Surge to expand federal AI expertise in collaboration with partners at the Office of Personnel Management and Office of Science and Technology Policy.",
          "Oversaw implementation of federal AI laws and policies, including overseeing implementation of the AI Use-Case Inventory under Executive Order 19360, in close coordination with the Chief Information Officer and Chief Data Officer Councils.",
          "Additionally, led execution of AI-related federal laws for OMB, including the 2022 AI Training Act and the 2022 Advancing American AI Act.",
          "Led government-wide AI training in collaboration with the General Services Administration (GSA) and Stanford’s Human Artificial Intelligence Institute. Training received over 8,000 federal participants and covered AI fundamentals, risks, and opportunities.",
          "Co-led drafting of Federal Risk and Authorization Management Program Policy, the primary federal program for cloud security compliance for the federal government. The policy is the largest change to FedRAMP since its creation."
        ]
      }
    },
    {
      "organization": {
        "organization": "White House Leadership Development Program"
      },
      "title": {
        "title": ""
      },
      "date": {
        "startDate": "",
        "endDate": "",
        "present": false
      },
      "details": {
        "activities": [
          "Selected for a competitive leadership fellowship that places high-achieving civil servants in year-long roles in the White House and provides comprehensive leadership training and skills development."
        ],
        "accomplishments": []
      }
    },
    {
      "organization": {
        "organization": "Dept. of Homeland Security, U.S. Citizenship and Immigration Services"
      },
      "title": {
        "title": "Chief of Innovation and Design, Refugee, Asylum, and International Operations Directorate, GS-15"
      },
      "date": {
        "startDate": "06/01/2019",
        "endDate": "present",
        "present": true
      },
      "details": {
        "activities": [
          "Directed innovation, technology, data, and design for the Refugee and Asylum Programs at USCIS, founding and leading a new 60-person innovation office, as well as recruitment and product strategy for 150 federal and contract software development and data analytics staff for the Refugee and Asylum Programs.",
          "Encouraged human-centered practices, enterprise and agile development approaches, and collaborative and empowered partnerships.",
          "Managed three federal data and analytics teams, spanning the domestic asylum, overseas refugee, workforce, and machine learning and advanced analytics focus areas, including fifteen federal staff and a dozen contractors.",
          "Defined data “playbook” and spearheaded leveraging new platforms such as Databricks, Tableau, and other cloud-based data operations workflows.",
          "Implemented responsible oversight with data quality controls and human-in-the-loop processes and evaluations."
        ],
        "accomplishments": [
          "Digitized the United States’ Asylum Process by leading efforts to allow asylum-seekers to apply online, doubling the number of annual Asylum applications filed, reduced the time from application to first appointment by 20 days, and establishing a fully paperless process for Asylum.",
          "Over 400,000 asylum seekers have used the system in two years since launch.",
          "Led technology effort to enable remote work and reopen all nation-wide Asylum offices after they were closed in the wake of the coronavirus pandemic.",
          "Oversaw novel technology to provide iPads video conference, document review, and signature interfaces that allowed staff to conduct Asylum interviews from home.",
          "New process allowed Asylum Division to resume operations and conduct over 10,000 interviews, surpassing its annual case completion targets.",
          "Leveraged novel hiring techniques to grow team, including hiring the first Data Scientist at USCIS from a government-wide certificate, classified the first Machine Learning Specialist position at USCIS, and developed package to receive direct hire authority for 2210 IT Specialist positions.",
          "Built a $20 million dollar machine-learning fraud detection application that scanned over 150,000 asylum fillings to identify boiler-plate fraud and corrupt preparers and attorneys using word-vector algorithms.",
          "Progressed from conception to deployment in six months and produced leads for federal investigation of fraud within the first year of use."
        ]
      }
    },
    {
      "organization": {
        "organization": "Dept. of Homeland Security, U.S. Citizenship and Immigration Services"
      },
      "title": {
        "title": "Senior Advisor for Technology, Refugee, Asylum, and International Operations Directorate, GS-15"
      },
      "date": {
        "startDate": "08/01/2018",
        "endDate": "06/01/2019",
        "present": false
      },
      "details": {
        "activities": [
          "Served as lead technology advisor to, developing a long-term technological, data and organizational strategy for USCIS’ humanitarian immigration programs in alignment with DHS and USCIS strategic plans and administration priorities.",
          "Served as USCIS lead on data integration efforts on Southwest Border processing collaborating with an interagency team to develop enterprise data architecture and cloud technology platforms to create a real-time dashboard that provided critical information to the Deputy Secretary, the Director of USCIS, an Commissioner of Customer and Border Protection on pending border cases and their outcomes.",
          "Briefed successful outcomes to the White House and Departmental leadership."
        ],
        "accomplishments": [
          "Secured quintuple the resources and staffing for the main case management system for refugee and asylum adjudications by gaining investment from senior executives as well as utilizing existing agency resources strategically, leading to deployment of numerous efficiencies including a decision-making tool that improves efficiency as much as 20% on over 100,000 adjudications annually."
        ]
      }
    },
    {
      "organization": {
        "organization": "United States Digital Service"
      },
      "title": {
        "title": "Digital Services Expert, Department of Homeland Security, Office of the CIO, Front Office, GS-15"
      },
      "date": {
        "startDate": "08/01/2017",
        "endDate": "08/01/2018",
        "present": false
      },
      "details": {
        "activities": [
          "Led technology and data initiatives across the government including efforts to improve the accession process at the Coast Guard, investigated and advised senior executives on the use of robotics process automation at DHS HQ, wrote report on FOIA processing, and worked with colleagues at the Office of Management and Budget and the OPM to reform hiring practices for IT Specialists across the federal government.",
          "Directed cybersecurity, accessibility and privacy compliance processes."
        ],
        "accomplishments": [
          "Project-managed and engineered a software application to track critical information about pending Syrian applicants including overseeing a four-person team developing a C# application that managed and displayed over 100,000 data points of open-source information about Syrian country information.",
          "The final application was used in over 50,000 Syrian refugee cases, featured in the 120-day report to the President on refugee processing, and received a USCIS Director’s Pioneer Award for Innovation."
        ]
      }
    },
    {
      "organization": {
        "organization": "Dept. of homeland security, U.S. Citizenship and Immigration Service"
      },
      "title": {
        "title": "Refugee Officer, Refugee Affairs Division Officer, GS 9-12"
      },
      "date": {
        "startDate": "06/01/2014",
        "endDate": "08/01/2017",
        "present": false
      },
      "details": {
        "activities": [
          "Led a team of nine to Ethiopia during a national state of emergency and served as a Senior Officer reviewing and interviewing the most complicated cases in Kenya and Turkey.",
          "Resolved sensitive incidents with partners at the U.S. Embassy, United Nations, and International Organization for Migration."
        ],
        "accomplishments": [
          "Led project and software development of a new refugee assessment tool that saves fifteen-twenty minutes per refugee interview and has been used in interviews with over 200,000 refugees."
        ]
      }
    },
    {
      "organization": {
        "organization": "Business Council for International Understanding"
      },
      "title": {
        "title": "Senior Fellow"
      },
      "date": {
        "startDate": "12/01/2013",
        "endDate": "03/01/2014",
        "present": false
      },
      "details": {
        "activities": [
          "Coordinated business forums between C-level executives at Fortune 500 companies and United States and foreign government officials.",
          "Oversaw and led engagements including a visit of the Libyan Minister of Finance hosted by the Chief Executive Officer of Citigroup’s Public Sector Group and an engagement with the Chief Executive Office of Qatar’s Sovereign Wealth Fund and C-Level investors from companies such as Bridgewater."
        ],
        "accomplishments": []
      }
    },
    {
      "organization": {
        "organization": "Profiles in Public Service Podcast, Partnership for Public Service"
      },
      "title": {
        "title": ""
      },
      "date": {
        "startDate": "",
        "endDate": "",
        "present": false
      },
      "details": {
        "activities": [
          "Modernizing the Asylum Process Experience (https://ourpublicservice.org/podcast/modernizing-the-asylum-process-experience/)"
        ],
        "accomplishments": []
      }
    },
    {
      "organization": {
        "organization": "BOLD Gov Conference, Government Executive and Next Gov"
      },
      "title": {
        "title": ""
      },
      "date": {
        "startDate": "",
        "endDate": "",
        "present": false
      },
      "details": {
        "activities": [
          "How Tablets Kept the Asylum Program Safe: Creative Digital Responses to the COVID Emergency at USCIS"
        ],
        "accomplishments": []
      }
    },
    {
      "organization": {
        "organization": "University of Maryland, College Park, MD"
      },
      "title": {
        "title": "Master’s in Professional Studies"
      },
      "date": {
        "startDate": "2011",
        "endDate": "2013",
        "present": false
      },
      "details": {
        "activities": [
          "GPA: 3.9"
        ],
        "accomplishments": []
      }
    },
    {
      "organization": {
        "organization": "Yale University, New Haven, CT"
      },
      "title": {
        "title": "Bachelor of Arts"
      },
      "date": {
        "startDate": "2007",
        "endDate": "2011",
        "present": false
      },
      "details": {
        "activities": [
          "Honors: Phi Beta Kappa, Magna Cum Laude, and Distinction in Major.",
          "GPA: 3.88"
        ],
        "accomplishments": []
      }
    }
  ]
}`

export const DUMMY_FULL_ECQ_TEXT = `In my tenure as a Senior Policy Analyst at the Office of the Federal CIO, I was at the forefront of addressing the burgeoning challenges and opportunities presented by artificial intelligence (AI) in the federal government. Recognizing the transformative potential of AI, as well as the need for a robust framework to ensure its safe, secure, and trustworthy deployment, I spearheaded the development of key sections of an Executive Order on AI. This initiative required not only a deep understanding of the technology but also an acute awareness of the broader implications for policy, ethics, and governance.The landscape of AI was rapidly evolving, with generative AI presenting both unprecedented capabilities and complex risks.

My approach was to question conventional wisdom and advocate for innovative policies that would position the federal government as a leader in responsible AI use. I designed and implemented a comprehensive policy strategy that would guide the federal government's adoption of AI technologies, ensuring they were leveraged to enhance public service while safeguarding civil liberties and national security.

To achieve this, I collaborated with a diverse set of stakeholders, including experts from the Office of Personnel Management and the Office of Science and Technology Policy. Together, we crafted sections of the Executive Order that addressed the need for a National AI Talent Surge, aiming to bolster the government's expertise in AI. This initiative was strategic, targeting long-term capacity building to manage and leverage AI effectively across federal agencies.The dynamic nature of AI policy required a high degree of flexibility. I adapted to new information and shifting conditions, integrating feedback from various agencies and aligning our objectives with the rapidly changing technological landscape. My resilience was tested as we navigated complex interagency negotiations and reconciled differing viewpoints. Despite these challenges, I remained steadfast in my commitment to crafting a policy that was both forward-looking and actionable.Leading the sub-Interagency Policy Committee on "AI Use in the Federal Government," I employed strategic thinking to formulate policy recommendations that would have lasting impacts. I recognized the importance of managing risks associated with AI, such as bias and privacy concerns, while capitalizing on opportunities to improve government efficiency and service delivery.The vision I fostered was one of a government equipped to harness the power of AI while maintaining the trust of the American people. This vision required not only the development of new policies but also a cultural shift within the federal workforce to embrace AI as a tool for public good. My leadership acted as a catalyst for this change, influencing others to translate our shared vision into concrete actions.The result of these efforts was a comprehensive and actionable Executive Order that set the stage for the federal government to lead by example in the responsible use of AI. It laid the groundwork for a surge in AI talent within the government, ensuring that the United States remained at the forefront of AI innovation and governance. My work not only addressed immediate needs but also established a strategic framework that would guide the federal government's approach to AI for years to come, demonstrating a commitment to leading change in an era defined by technological advancement.`;

export const DUMMY_ECQ_PARAGRAPH_TEXT  = `My approach was to question conventional wisdom and advocate for innovative policies that would position the federal government as a leader in responsible AI use. I designed and implemented a comprehensive policy strategy that would guide the federal government's adoption of AI technologies, ensuring they were leveraged to enhance public service while safeguarding civil liberties and national security.`;
export const DUMMY_FULL_ECQ_FILENAME = `GeneratedDocument-2075763b7a463bea5d1f29a8ba19afae-1706739995136.docx`;

export const DUMMY_FULL_ECQ_URL = `https://fedjobs.s3.us-east-2.amazonaws.com/GeneratedDocument-2075763b7a463bea5d1f29a8ba19afae-1706739995136.docx`;

export const DUMMY_FULL_ECQ_DOC_ID = 12;


// Re-export the getPrettyPrintType function from types package
export { getPrettyPrintType } from '@fedjobs/types';

export const PINECONE_INDEX_NAME = 'fedjobs';