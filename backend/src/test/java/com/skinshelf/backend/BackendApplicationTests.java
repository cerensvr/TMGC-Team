package com.skinshelf.backend;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
class BackendApplicationTests {

	@Autowired
	private JdbcTemplate jdbcTemplate;

	@Autowired
	private MockMvc mockMvc;

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

	@Test
	void legalDocumentsArePublicAndRenderedAsHtml() throws Exception {
		for (String path : List.of("privacy", "terms", "data-deletion")) {
			mockMvc.perform(get("/legal/" + path))
					.andExpect(status().isOk())
					.andExpect(content().contentTypeCompatibleWith("text/html"))
					.andExpect(content().string(containsString("SkinShelf")));
		}
	}

}
