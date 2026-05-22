import React, { useState } from "react";
import { View, Text, Image, Pressable} from "react-native";
import Modal from "react-native-modal";
import styles from "./style";
import { TouchableOpacity } from "react-native-gesture-handler";


const ExitResponse = (props) => {
  const [showRetrieve, setShowRetrieve] = useState(false);


  return (
    <Modal
      isVisible={props.visibleExit}
      onBackdropPress={props.returnBack}
      onSwipeComplete={() => setShowRetrieve(false)}
      swipeDirection="left"
      animationIn="slideInUp"
      animationInTiming={300}
      animationOut="slideOutDown"
      animationOutTiming={300}
      useNativeDriver={false}
      hasBackdrop={true}
      // backdropColor="#5f9a32"
      backdropOpacity={0.8}
      coverScreen={true}>
      <Pressable style={styles.outsideModal}
        onPress={(event) => {
          if (event.target == event.currentTarget) {
            setShowRetrieve1(false);
          }
        }} >
        <View style={styles.body5}>

          <View style={styles.imageHolder}>

            <Image source={require("../../assets/logo.png")} style={styles.padImg} />
            <Text style={styles.titleText}>{props.title}</Text>

          </View>
          <View style={styles.reasonCover}>
            <Text style={styles.reasonText}>{props.message}</Text>
          </View>
    <View style={styles.btnCover}>
      <TouchableOpacity style={styles.exitBtn} onPress={props.yes}>
        <Text style={styles.exitText}>Yes</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.exitBtn} onPress={(event) => {
          if (event.target == event.currentTarget) {
            setShowRetrieve1(false);
          }
        }}>
        <Text style={styles.exitText}>No</Text>
      </TouchableOpacity>
    </View>

        </View>
      </Pressable>
    </Modal>
  )
};

export default ExitResponse 