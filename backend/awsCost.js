const { CostExplorerClient, GetCostAndUsageCommand, GetDimensionValuesCommand } = require("@aws-sdk/client-cost-explorer");

function getClient(credentials) {
  if (!credentials || !credentials.accessKeyId || !credentials.secretAccessKey || !credentials.region) {
    throw new Error("Missing AWS credentials.");
  }
  return new CostExplorerClient({
    region: credentials.region,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey
    }
  });
}

function getTimePeriod(start, end) {
  if (start && end) {
    return { Start: start, End: end };
  }
  const fallbackEnd = new Date();
  const fallbackStart = new Date();
  fallbackStart.setMonth(fallbackStart.getMonth() - 1);
  return {
    Start: fallbackStart.toISOString().split('T')[0],
    End: fallbackEnd.toISOString().split('T')[0]
  };
}

async function getServices(credentials) {
  const client = getClient(credentials);
  const command = new GetDimensionValuesCommand({
    TimePeriod: getTimePeriod(),
    Dimension: "SERVICE"
  });

  const response = await client.send(command);
  return response.DimensionValues.map(v => v.Value);
}

async function getCost(service, credentials, start, end) {
  const client = getClient(credentials);
  const commandInput = {
    TimePeriod: getTimePeriod(start, end),
    Granularity: "DAILY",
    Metrics: ["UnblendedCost"],
    GroupBy: []
  };

  if (service && service !== "ALL") {
    commandInput.GroupBy = [{ Type: "DIMENSION", Key: "LINKED_ACCOUNT" }];
    commandInput.Filter = {
      Dimensions: {
        Key: "SERVICE",
        Values: [service]
      }
    };
  } else {
    commandInput.GroupBy = [
      { Type: "DIMENSION", Key: "SERVICE" },
      { Type: "DIMENSION", Key: "LINKED_ACCOUNT" }
    ];
  }

  const command = new GetCostAndUsageCommand(commandInput);
  const response = await client.send(command);
  
  if (!response.ResultsByTime || response.ResultsByTime.length === 0) return [];
  
  const formattedData = [];
  response.ResultsByTime.forEach(timeblock => {
    const dateStr = timeblock.TimePeriod.Start;
    timeblock.Groups.forEach(g => {
      let svcName = service;
      let account = "Unknown";
      
      if (service === "ALL" || !service) {
        svcName = g.Keys[0];
        account = g.Keys[1];
      } else {
        account = g.Keys[0];
      }

      formattedData.push({
        date: dateStr,
        service: svcName,
        account: account,
        cost: parseFloat(g.Metrics.UnblendedCost.Amount)
      });
    });
  });

  return formattedData;
}

module.exports = { getCost, getServices };
