const { subjectNameById } = require("../models/subCategory.model");
const catModel = require("../models/category.model");
const { bySubjectId } = require("../models/course.model");
const courseModel = require("../models/course.model");
const subCatModel = require("../models/subCategory.model");
const { getMessage, sendMessage } = require("../utils/chatbot.utils");

const router = require("express").Router();

router.get("/", function (req, res) {
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
  console.log("Webhook verification step");

  if (
    req.query["hub.mode"] === "subscribe" &&
    req.query["hub.verify_token"] === VERIFY_TOKEN
  ) {
    res.status(200).send(req.query["hub.challenge"]);
  } else {
    console.log("Authentication failed!");
    res.sendStatus(403);
  }
});

router.post("/", function (req, res) {
  console.log("Webhook messaging step");
  var chat_data = req.body;

  console.log(chat_data);
  console.log("Chat data object: ", chat_data.object);

  if (chat_data.object == "page") {
    chat_data.entry.forEach((page_body) => {
      page_body.messaging.forEach(async function (mess_obj) {
        console.log(mess_obj);

        if (mess_obj.message) {
          getMessage(mess_obj);
          const sender_id = mess_obj.sender.id;
          const text = mess_obj.message.text;

          await handleThreeFeature(sender_id, text);
        }
      });
    });

    res.sendStatus(200);
  }
});

function SayHi(sender_id) {
  const message = `
  Hi! I'm a Chat Bot Service from Online Academy API Service server!\n
Right now I'm have three features\n
Send me one of your code options below:\n
1. Search course by keyword\n
2. Accept course by category\n
3. View course detail\n
Which feature do you want to use?\n
Note: whenever you wanna call me, just send "bot" :)
  `;
  return sendMessage(sender_id, message);
}

function SayNotFound(sender_id) {
  const message = `
  Sorry, I can't find any course or feature with the keyword you have send :((\n
Right now I have three features.\n
Send me one of your code options below:\n
1. Search course by keyword\n
2. Accept course by category\n
3. View course detail\n
Which feature do you want to use?\n\n
Note: whenever you wanna call me, just send "bot" :)
  `;
  return sendMessage(sender_id, message);
}

async function searchCourseByKeyword(keyword) {
  const ret = await courseModel.fullTextSearchPagi(keyword, 9, 0);
  return ret;
}
async function detailCat(id) {
  const sub_cat_detail = await subCatModel.detail(id);
  if (sub_cat_detail === undefined) {
    return undefined;
  }
  return sub_cat_detail;
}

async function detailCourse(id) {
  const course_detail = await courseModel.detail(id);
  console.log(course_detail);
  if (course_detail === undefined) {
    return undefined;
  }
  const ret = `
  These are the detail of the course:
  \n- Name: ${course_detail.course_name}
  \n- Id: ${course_detail.course_id}
  \n- Title: ${course_detail.course_title}
  \n- Avatar: ${course_detail.course_avatar_url}
  \n- Fee: ${course_detail.course_fee}
  \n- Last update: ${course_detail.course_last_updated}
  \n- View: ${course_detail.views}
  \n- Category: ${course_detail.subject_name}
  \n- Instructor:${course_detail.user_name}
  \n- Status: ${course_detail.is_finished ? "Completed" : "Not completed"}
  \n- Rate: ${course_detail.avg_rate ? course_detail.avg_rate : "No rate"}`;

  return ret;
}

async function handleAcceptByCat(subcat_id) {
  const ret = await courseModel.acceptAllCourseBySubcat(subcat_id);

  return ret.affectedRows;
}

async function handleThreeFeature(sender_id, text) {
  if (!isNaN(+text)) {
    switch (+text) {
      case 1:
        //  Search course by keyword\n
        const message = "Enter keyword";
        await sendMessage(sender_id, message);
        break;
      case 2:
        //  Accept course by category\n
        const message2 = "There are categories list";
        await sendMessage(sender_id, message2);

        const allCat = await subCatModel.all();

        let mess_cat = "";
        for (let i = 0; i < allCat.length; ++i) {
          mess_cat += `Cat ${i + 1}: ${allCat[i].subject_name}\n`;
        }
        setTimeout(async () => {
          await sendMessage(sender_id, mess_cat);
        }, 200);
        setTimeout(async () => {
          await sendMessage(
            sender_id,
            "Which category that you want to accept courses?\nPlease follow this syntax to enter: 'cat:1'"
          );
        }, 400);
        break;
      case 3:
        //   View course detail\n
        const message3 = "Enter course id and follow this syntax 'course_id:1'";
        await sendMessage(sender_id, message3);
        break;

      default:
        await sendMessage(
          sender_id,
          "This message was sent from Online Academy API Service server!"
        );
        await SayHi(sender_id);
        break;
    }
  } else if (text.includes("bot")) {
    await SayHi(sender_id);
  } else if (text.includes("cat")) {
    const curr_text = text;

    const id = curr_text.trim().split(":")[1];

    // const ret = await detailCat(id);

    const catName = await subjectNameById(id);

    if (catName !== undefined) {
      // const ret_handle_accept_courses = await handleAcceptByCat(id);

      const allCourseInCat = await bySubjectId(id);

      if (allCourseInCat.length !== 0) {
        await sendMessage(
          sender_id,
          `These are all the Courses of category ${catName.subject_name}:`
        );
        setTimeout(async () => {
          for (let i = 0; i < allCourseInCat.length; ++i) {
            await sendMessage(
              sender_id,
              // Result ${i + 1}:\n
              `- Name: ${allCourseInCat[i].course_name}\n- Price: ${
                allCourseInCat[i].course_fee
              }\n- Status: ${
                allCourseInCat[i].is_finished ? "Completed" : "Not completed"
              }\n- Category:  ${allCourseInCat[i].subject_name}\n- Rate: ${
                allCourseInCat[i].avg_rate
                  ? allCourseInCat[i].avg_rate
                  : "No rate"
              }`
            );
          }
        }, 1000);
      } else {
        await sendMessage(
          sender_id,
          `There are currently no Course in Category ${catName.subject_name}`
        );
        // await SayNotFound(sender_id);
      }

      // await sendMessage(
      //   sender_id,
      //   `There are ${+ret_handle_accept_courses} courses in category ${
      //     ret.subject_name
      //   } were accepted\n`
      // );
    } else {
      await sendMessage(sender_id, `Category not found!`);
    }
  } else if (text.includes("course_id")) {
    const curr_text = text;
    let id = "";

    for (let i = curr_text.indexOf(":") + 1; i < curr_text.length; ++i) {
      id += curr_text[i];
    }
    const ret = await detailCourse(id);

    if (ret !== undefined) {
      await sendMessage(sender_id, ret);
    } else {
      await sendMessage(sender_id, `Course not found!`);
    }
  } else {
    const courses_by_keyword = await searchCourseByKeyword(text);

    if (courses_by_keyword.length !== 0) {
      for (let i = 0; i < courses_by_keyword.length; ++i) {
        await sendMessage(
          sender_id,
          // Result ${i + 1}:\n
          `- Name: ${courses_by_keyword[i].course_name}\n- Price: ${
            courses_by_keyword[i].course_fee
          }\n- Status: ${
            courses_by_keyword[i].is_finished ? "Completed" : "Not completed"
          }\n- Category:  ${courses_by_keyword[i].subject_name}\n- Rate: ${
            courses_by_keyword[i].avg_rate
          }`
        );
      }
    } else {
      await SayNotFound(sender_id);
    }
  }
}

module.exports = router;
