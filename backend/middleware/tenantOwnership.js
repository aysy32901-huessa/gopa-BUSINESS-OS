import User from "../models/User.js";

export async function getClientAccessFilter(req) {
  const tenantId = req.tenantId;
  const role = req.user.role;
  const userId = req.user.userId;

  // المدير العام يستطيع الوصول إلى جميع عملاء شركته.
  if (role === "general_admin") {
    return { tenantId };
  }

  // الموظف يرى العملاء المسندة إليه فقط.
  if (role === "employee") {
    return {
      tenantId,
      assignedTo: userId,
    };
  }

  // مدير القسم يرى العملاء المسندة لأعضاء قسمه.
  if (role === "department_manager") {
    const departmentId = req.user.department;

    if (!departmentId) {
      return {
        tenantId,
        assignedTo: userId,
      };
    }

    const departmentUsers = await User.find({
      tenantId,
      department: departmentId,
      isActive: true,
    }).distinct("_id");

    const allowedUsers = [
      ...departmentUsers.map((id) => id.toString()),
      userId.toString(),
    ];

    return {
      tenantId,
      assignedTo: { $in: [...new Set(allowedUsers)] },
    };
  }

  return {
    tenantId,
    _id: null,
  };
}

export async function validateClientAssignee(req, assignedTo) {
  if (!assignedTo) {
    if (req.user.role === "general_admin") {
      return null;
    }

    throw Object.assign(
      new Error("A responsible employee must be selected."),
      { statusCode: 400 }
    );
  }

  const user = await User.findOne({
    _id: assignedTo,
    tenantId: req.tenantId,
    isActive: true,
  }).select("_id tenantId department role");

  if (!user) {
    throw Object.assign(
      new Error("The selected employee does not belong to this company or is inactive."),
      { statusCode: 400 }
    );
  }

  if (req.user.role === "department_manager") {
    const isSameDepartment =
      req.user.department &&
      user.department &&
      user.department.toString() === req.user.department.toString();

    const isSelf =
      user._id.toString() === req.user.userId.toString();

    if (!isSameDepartment && !isSelf) {
      throw Object.assign(
        new Error("You can only assign clients to employees in your department."),
        { statusCode: 403 }
      );
    }
  }

  return user._id;
}