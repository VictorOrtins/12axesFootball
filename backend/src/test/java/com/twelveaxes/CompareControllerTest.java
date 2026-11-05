package com.twelveaxes;

import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.hasSize;
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
class CompareControllerTest {
    private static final String CENTER = "50,50,50,50,50,50,50,50,50,50,50,50";

    @Autowired
    private MockMvc mockMvc;

    @Test
    void catalogListsAllThreeTypes() throws Exception {
        mockMvc.perform(get("/api/compare/catalog").param("lang", "pt"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(24))
                .andExpect(jsonPath("$[?(@.type=='manager')]").isNotEmpty())
                .andExpect(jsonPath("$[?(@.type=='team')]").isNotEmpty())
                .andExpect(jsonPath("$[?(@.type=='football-ideology')]").isNotEmpty());
    }

    @Test
    void footballIdeologyHasNoImageAndTeamsCanHaveOne() throws Exception {
        mockMvc.perform(get("/api/compare/catalog").param("lang", "en"))
                .andExpect(jsonPath("$[?(@.type=='football-ideology')]").isNotEmpty())
                .andExpect(jsonPath("$[?(@.type=='football-ideology' && @.imagePath != null)]", hasSize(0)))
                .andExpect(jsonPath("$[?(@.type=='team' && @.imagePath != null)]").isNotEmpty());
    }

    @Test
    void comparesWithAManager() throws Exception {
        mockMvc.perform(get("/api/compare")
                        .param("type", "manager").param("id", "fx-treinador-1").param("v", CENTER).param("lang", "pt"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.item.id").value("fx-treinador-1"))
                .andExpect(jsonPath("$.item.type").value("manager"))
                .andExpect(jsonPath("$.compatibility", greaterThan(0.0)))
                .andExpect(jsonPath("$.vector.pos").isNumber())
                .andExpect(jsonPath("$.vector.length()").value(12));
    }

    @Test
    void comparesWithATeamAndAFootballIdeology() throws Exception {
        mockMvc.perform(get("/api/compare").param("type", "team").param("id", "fx-time-1").param("v", CENTER))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.item.type").value("team"))
                .andExpect(jsonPath("$.vector.length()").value(12));
        mockMvc.perform(get("/api/compare").param("type", "football-ideology").param("id", "fx-proativo").param("v", CENTER))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.item.type").value("football-ideology"))
                .andExpect(jsonPath("$.vector.length()").value(12));
    }

    @Test
    void rejectsUnknownTypeUnknownIdAndBadVector() throws Exception {
        mockMvc.perform(get("/api/compare").param("type", "planet").param("id", "x").param("v", CENTER))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/compare").param("type", "manager").param("id", "nobody").param("v", CENTER))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/compare").param("type", "manager").param("id", "fx-treinador-1").param("v", "abc"))
                .andExpect(status().isBadRequest());
    }
}
