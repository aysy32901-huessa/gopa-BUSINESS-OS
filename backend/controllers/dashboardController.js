
import DashboardService from "../services/dashboardService.js";
import asyncHandler from "../utils/asyncHandler.js";

const getOverview = asyncHandler(async (req, res) => {
  const data = await DashboardService.getDashboardOverview({
    user: req.user,
    tenantId: req.tenantId,
  });

  res.status(200).json({
    success: true,
    message: "Dashboard overview retrieved successfully.",
    data,
  });
});

export default {
  getOverview,
};
