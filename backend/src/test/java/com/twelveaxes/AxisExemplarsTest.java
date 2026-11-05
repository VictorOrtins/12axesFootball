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
class AxisExemplarsTest {
    @Autowired
    private MockMvc mockMvc;

    // No fixture, pos: 82, 18, 39, 52, 65, 78, 91, 4, 17, 30.
    @Test
    void picksTheStrongestManagersOnEachSideOfAnAxis() throws Exception {
        mockMvc.perform(get("/api/axes/exemplars").param("lang", "pt"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(12))
                .andExpect(jsonPath("$[?(@.axisId=='pos')].left[0].id").value("fx-treinador-7"))
                .andExpect(jsonPath("$[?(@.axisId=='pos')].left[0].leftPercent").value(91.0))
                .andExpect(jsonPath("$[?(@.axisId=='pos')].left.length()").value(3))
                .andExpect(jsonPath("$[?(@.axisId=='pos')].right[0].id").value("fx-treinador-8"))
                .andExpect(jsonPath("$[?(@.axisId=='pos')].right.length()").value(3));
    }

    @Test
    void leavesOutManagersNearTheCentre() throws Exception {
        mockMvc.perform(get("/api/axes/exemplars"))
                .andExpect(jsonPath("$[*].left[?(@.leftPercent < 60)]").isEmpty())
                .andExpect(jsonPath("$[*].right[?(@.leftPercent > 40)]").isEmpty());
    }
}
