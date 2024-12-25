export const singlePositionXml = `
  <position>
    <organization>Test Company</organization>
    <title>Software Engineer</title>
    <date startDate="2020-01-01" endDate="2021-12-31" present="false"></date>
    <details>
      <activity>Led development team</activity>
      <activity>Managed projects</activity>
      <accomplishment>Increased performance by 50%</accomplishment>
      <accomplishment>Reduced bugs by 30%</accomplishment>
    </details>
  </position>
`;

export const multiplePositionsXml = `
  <resume>
    <position>
      <organization>Company 1</organization>
      <title>Role 1</title>
      <date startDate="2020-01-01" endDate="2021-12-31" present="false"></date>
      <details>
        <activity>Activity 1</activity>
        <accomplishment>Accomplishment 1</accomplishment>
      </details>
    </position>
    <position>
      <organization>Company 2</organization>
      <title>Role 2</title>
      <date startDate="2022-01-01" endDate="" present="true"></date>
      <details>
        <activity>Activity 2</activity>
        <accomplishment>Accomplishment 2</accomplishment>
      </details>
    </position>
  </resume>
`;

export const invalidXml = {
    missingClose: '<position><organization>Test</organization><title>',
    malformedDate: `
      <position>
        <organization>Test</organization>
        <title>Test</title>
        <date startDate="invalid"></date>
        <details></details>
      </position>
    `,
    emptyTags: `
      <position>
        <organization></organization>
        <title></title>
        <date startDate="" endDate="" present="false"></date>
        <details></details>
      </position>
    `
  };