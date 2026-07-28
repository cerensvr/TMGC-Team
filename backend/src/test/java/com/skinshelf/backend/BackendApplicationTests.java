package com.skinshelf.backend;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class BackendApplicationTests {

	@Autowired
	private JdbcTemplate jdbcTemplate;

	@Test
	void contextLoads() {
	}

	@Test
	void flywayAppliesAllMigrationsToIsolatedTestDatabase() {
		Integer migrationCount = jdbcTemplate.queryForObject(
				"select count(*) from flyway_schema_history where success = true and version is not null",
				Integer.class);

		org.junit.jupiter.api.Assertions.assertEquals(6, migrationCount);
	}

}
