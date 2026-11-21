---
name: db-design
description: Use this skill when the user asks for designing a new db table in sims repo.
---

# Rules:

- No Foreign Keys, but the name of the keys should hint towards the link between the tables.
- Every table has the soft delete ('A' for active and 'Z' for soft delted).
- Use VARCHAR for any string datatype and delete status value.
- Use the DOUBLE(10, 2) for decimal values.
- Use INT for interger values(UNSIGNED for id).
- Name of the table will all capital.

# Example

`status` VARCHAR(1) NOT NULL DEFAULT 'A' COMMENT 'Soft delete: A=Active, Z=Deleted',
`created_by` INT UNSIGNED NULL,
`updated_by` INT UNSIGNED NULL,
`created_on` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
`updated_on` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,