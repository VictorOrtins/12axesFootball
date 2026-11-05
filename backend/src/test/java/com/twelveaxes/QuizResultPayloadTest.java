package com.twelveaxes;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class QuizResultPayloadTest {
    // Vetor de 12 eixos no formato aceito por /api/results/by-axes.
    private static final String VETOR = "72,72,72,72,72,72,72,72,72,72,72,72";

    @Autowired
    private MockMvc mockMvc;

    @Test
    void sharedResultCarriesEveryNewSection() throws Exception {
        mockMvc.perform(get("/api/results/by-axes").param("v", VETOR))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.axes.length()").value(12))
                .andExpect(jsonPath("$.matches.length()").value(4))
                .andExpect(jsonPath("$.bottomFootballIdeologyMatch.footballIdeologyId").isNotEmpty())
                .andExpect(jsonPath("$.topTeamMatch.teamId").isNotEmpty())
                .andExpect(jsonPath("$.topTeamMatches.length()").value(3))
                .andExpect(jsonPath("$.teamDimensionMatches.length()").value(3))
                .andExpect(jsonPath("$.teamDimensionMatches[0].dimension").value("tactics"))
                .andExpect(jsonPath("$.bottomTeamMatches.length()").value(3))
                .andExpect(jsonPath("$.topManagerMatch.category").isNotEmpty())
                .andExpect(jsonPath("$.managerDimensionMatches.length()").value(3))
                .andExpect(jsonPath("$.managerDimensionMatches[0].dimension").value("tactics"))
                .andExpect(jsonPath("$.categoryBestMatches.length()").value(5))
                .andExpect(jsonPath("$.bottomManagerMatches.length()").value(3))
                .andExpect(jsonPath("$.mostUnusualAxis.axisId").isNotEmpty())
                .andExpect(jsonPath("$.mostUnusualAxis.label").isNotEmpty())
                .andExpect(jsonPath("$.mostUnusualAxis.abovePole").isNotEmpty())
                .andExpect(jsonPath("$.mostCommonAxis.axisId").isNotEmpty());
    }

    @Test
    void englishResultCarriesEveryNewSection() throws Exception {
        mockMvc.perform(get("/api/results/by-axes").param("v", VETOR).param("lang", "en"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.managerDimensionMatches.length()").value(3))
                .andExpect(jsonPath("$.managerDimensionMatches[0].dimension").value("tactics"))
                .andExpect(jsonPath("$.categoryBestMatches.length()").value(5))
                .andExpect(jsonPath("$.categoryBestMatches[0].category").isNotEmpty())
                .andExpect(jsonPath("$.topTeamMatch.name").value(org.hamcrest.Matchers.startsWith("Team ")));
    }
}
