// constants/enums.js
// All ENUM value arrays from MASTER_PROMPT Section 4.3
// Use these in Joi validation schemas and wherever ENUMs are referenced.

const USER_STATUS          = ['active', 'inactive', 'suspended'];
const PRODUCT_TYPE         = ['storable', 'consumable', 'service'];
const PROCUREMENT_TYPE     = ['buy', 'manufacture', 'both'];
const PROCUREMENT_STRATEGY = ['MTS', 'MTO', 'MTS_MTO'];
const BOM_TYPE             = ['manufacture', 'kit', 'subcontract'];
const MO_TYPE              = ['MTS', 'MTO'];
const MO_STATUS            = ['draft', 'confirmed', 'in_progress', 'done', 'cancelled'];
const WO_STATUS            = ['pending', 'in_progress', 'done', 'cancelled'];
const SO_TYPE              = ['MTS', 'MTO'];
const SO_STATUS            = ['draft', 'confirmed', 'in_progress', 'done', 'cancelled'];
const PO_STATUS            = ['draft', 'sent', 'confirmed', 'received', 'cancelled'];
const TXN_REFERENCE_TYPE   = ['SO', 'PO', 'MO', 'ADJUSTMENT', 'RETURN', 'OPENING'];
const TXN_TYPE             = ['IN', 'OUT', 'RESERVE', 'UNRESERVE', 'ADJUST'];
const LOCATION_TYPE        = ['input', 'storage', 'output', 'quality', 'scrap'];
const RESERVATION_STATUS   = ['active', 'released', 'consumed'];
const RULE_STRATEGY        = ['MTS', 'MTO', 'MTS_MTO'];
const AUDIT_ACTION         = ['INSERT', 'UPDATE', 'DELETE'];

module.exports = {
    USER_STATUS,
    PRODUCT_TYPE,
    PROCUREMENT_TYPE,
    PROCUREMENT_STRATEGY,
    BOM_TYPE,
    MO_TYPE,
    MO_STATUS,
    WO_STATUS,
    SO_TYPE,
    SO_STATUS,
    PO_STATUS,
    TXN_REFERENCE_TYPE,
    TXN_TYPE,
    LOCATION_TYPE,
    RESERVATION_STATUS,
    RULE_STRATEGY,
    AUDIT_ACTION,
};
