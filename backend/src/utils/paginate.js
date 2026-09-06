/**
 * Extracts page/limit from query params and returns skip/take values.
 * Defaults: page=1, limit=25. Max limit capped at 200.
 */
function paginate(query = {}) {
  const page = Math.max(1, parseInt(query.page || 1, 10));
  const limit = Math.min(200, Math.max(1, parseInt(query.limit || 25, 10)));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

/**
 * Wraps a Prisma findMany result and count into a standard pagination envelope.
 */
function paginateResult(data, total, page, limit) {
  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

module.exports = { paginate, paginateResult };
