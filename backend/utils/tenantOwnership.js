
import mongoose from "mongoose";

// Verify that one referenced record belongs to the authenticated tenant.
export const assertTenantRecord = async ({
  Model,
  id,
  tenantId,
  fieldName = "Reference",
  required = false,
}) => {
  if (id === undefined || id === null || id === "") {
    if (required) {
      const error = new Error(`${fieldName} is required.`);
      error.statusCode = 400;
      throw error;
    }

    return null;
  }

  if (!mongoose.isValidObjectId(id)) {
    const error = new Error(`Invalid ${fieldName}.`);
    error.statusCode = 400;
    throw error;
  }

  const record = await Model.findOne({
    _id: id,
    tenantId,
  }).select("_id");

  if (!record) {
    const error = new Error(
      `${fieldName} is invalid or unavailable.`
    );
    error.statusCode = 400;
    throw error;
  }

  return record._id;
};

// Verify that all referenced records belong to the same tenant.
export const assertTenantRecords = async ({
  Model,
  ids,
  tenantId,
  fieldName = "References",
}) => {
  if (!Array.isArray(ids)) {
    const error = new Error(`${fieldName} must be an array.`);
    error.statusCode = 400;
    throw error;
  }

  const uniqueIds = [...new Set(ids.map(String))];

  if (uniqueIds.some((id) => !mongoose.isValidObjectId(id))) {
    const error = new Error(`One or more ${fieldName} are invalid.`);
    error.statusCode = 400;
    throw error;
  }

  if (uniqueIds.length === 0) {
    return [];
  }

  const records = await Model.find({
    _id: { $in: uniqueIds },
    tenantId,
  }).select("_id");

  if (records.length !== uniqueIds.length) {
    const error = new Error(
      `One or more ${fieldName} are invalid or unavailable.`
    );
    error.statusCode = 400;
    throw error;
  }

  return records.map((record) => record._id);
};
